const router = require("express").Router();
const { Conversation, Message } = require("../../db/models");
const onlineUsers = require("../../onlineUsers");
const { Op } = require("sequelize");

// expects {recipientId, text, conversationId } in body (conversationId will be null if no conversation exists yet)
router.post("/", async (req, res, next) => {
  try {
    if (!req.user) {
      return res.sendStatus(401);
    }
    const senderId = req.user.id;
    const { recipientId, text, conversationId, sender } = req.body;

    // if we already know conversation id, we can save time and just add it to message and return
    if (conversationId) {
      const message = await Message.create({ senderId, text, conversationId, readRecently: false });
      return res.json({ message, sender });
    }
    // if we don't have conversation id, find a conversation to make sure it doesn't already exist
    let conversation = await Conversation.findConversation(
      senderId,
      recipientId
    );

    if (!conversation) {
      // create conversation
      conversation = await Conversation.create({
        user1Id: senderId,
        user2Id: recipientId,
      });
      if (onlineUsers.includes(sender.id)) {
        sender.online = true;
      }
    }
    const message = await Message.create({
      senderId,
      text,
      conversationId: conversation.id,
      readRecently: false,
    });
    res.json({ message, sender });
  } catch (error) {
    next(error);
  }
});

router.put("/", async (req, res, next) => {
  try {
    if (!req.user) {
      return res.sendStatus(401);
    }

    const conversationInfo = await Conversation.findOne({where: {id: req.body.convoId}});
    if (req.user.id !== conversationInfo.user1Id && req.user.id !== conversationInfo.user2Id) {
      return res.sendStatus(403);
    }

    const userId = req.user.id;
    const {convoId, newestReceipt} = req.body;


    const oldRecentRead = await Message.findOne({where: {conversationId: convoId, senderId: {[Op.not] : userId}, readRecently: true}});
    if (oldRecentRead){
      await Message.update({
        readRecently: false,
      }, {
        where: {
          conversationId: convoId, 
          senderId: oldRecentRead.senderId, 
          text: oldRecentRead.text
        }
      });
    }

    const msgToChange = await Message.findOne({where: {conversationId: convoId, senderId: {[Op.not] : userId}, text: newestReceipt}});

    if(msgToChange){
      await Message.update({
        readRecently: true,
      }, {
        where: {
          conversationId: convoId, 
          senderId: {[Op.not] : userId}, 
          text: newestReceipt
        }
      });
      res.json({id: msgToChange.conversationId, recentMessage: msgToChange.text});
      
    }else{
      res.sendStatus(400);
    }
  } catch(error) {
    next(error);
  }
});

module.exports = router;
