const Conversation = require("./conversation");
const User = require("./user");
const Message = require("./message");
const GroupConvo = require("./groupConvos");

// associations

User.belongsToMany(Conversation, { through: GroupConvo});
Conversation.belongsToMany(User, { through: GroupConvo});
Message.belongsTo(Conversation);
Conversation.hasMany(Message);

module.exports = {
  User,
  Conversation,
  Message
};
