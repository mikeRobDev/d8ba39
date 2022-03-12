const Conversation = require("./conversation");
const User = require("./user");
const Sequelize = require("sequelize");
const db = require("../db");

const GroupConvo = db.define("groupConvo", {
    convoId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
            model: Conversation,
            key: "id"
        }
    },
    participantId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
            model: User,
            key: "id"
        }
    },
    recentRead: {
        type: Sequelize.INTEGER,
        allowNull: true,
    }
});

module.exports = GroupConvo;