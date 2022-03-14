const router = require("express").Router();
const { User, Conversation, Message } = require("../../db/models");
const { Op } = require("sequelize");
const onlineUsers = require("../../onlineUsers");

// get all conversations for a user, include latest message text for preview, and all messages
// include other user model so we have info on username/profile pic (don't include current user info)
router.get("/", async (req, res, next) => {
  try {
    if (!req.user) {
      return res.sendStatus(401);
    }
    const userId = req.user.id;
    const conversations = await Conversation.findAll({
      where: {
        [Op.or]: {
          user1Id: userId,
          user2Id: userId,
        },
      },
      attributes: ["id"],
      order: [[Message, "createdAt", "ASC"]],
      include: [
        { model: Message, order: ["createdAt", "ASC"] },
        {
          model: User,
          as: "user1",
          where: {
            id: {
              [Op.not]: userId,
            },
          },
          attributes: ["id", "username", "photoUrl"],
          required: false,
        },
        {
          model: User,
          as: "user2",
          where: {
            id: {
              [Op.not]: userId,
            },
          },
          attributes: ["id", "username", "photoUrl"],
          required: false,
        },
      ],
    });

    for (let i = 0; i < conversations.length; i++) {
      const convo = conversations[i];
      const convoJSON = convo.toJSON();
      if (convoJSON.messages.length > 0) {
        for (let k = 0; k < convoJSON.messages.length; k++){
          let msg = convoJSON.messages[k];
          if (msg.senderId === userId && msg.readRecently){  
            convoJSON.mostRecentRead = msg.text;
          }
        }
      }else{
        convoJSON.mostRecentRead = null;
      }
      
      let messagesReceived = convoJSON.messages.filter((message) => message.senderId !== userId).length;
      if (convoJSON.mostRecentRead) {
        let readMessageExists = false;
        let unreadMessages = 0;
        for (let k = 0; k < convoJSON.messages.length; k++){
          let msg = convoJSON.messages[k];
          if (readMessageExists && msg.senderId !== userId){
            unreadMessages += 1;
          }
          if (msg.readRecently && msg.senderId !== userId) {
            readMessageExists = true;
          }
        }
        convoJSON.unreadMsgCount = unreadMessages;

      }else{
        convoJSON.unreadMsgCount = messagesReceived;
      }

      // set a property "otherUser" so that frontend will have easier access
      if (convoJSON.user1) {
        convoJSON.otherUser = convoJSON.user1;
        delete convoJSON.user1;
      } else if (convoJSON.user2) {
        convoJSON.otherUser = convoJSON.user2;
        delete convoJSON.user2;
      }

      // set property for online status of the other user
      if (onlineUsers.includes(convoJSON.otherUser.id)) {
        convoJSON.otherUser.online = true;
      } else {
        convoJSON.otherUser.online = false;
      }

      convoJSON.latestMessageText = convoJSON.messages[convoJSON.messages.length - 1].text;
      conversations[i] = convoJSON;
    }
    conversations.sort((a, b) => (a.messages[a.messages.length - 1].createdAt < b.messages[b.messages.length - 1].createdAt));

    res.json(conversations);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
