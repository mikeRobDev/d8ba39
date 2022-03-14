import React from "react";
import { Box, Typography } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginLeft: 20,
    flexGrow: 1,
  },
  username: {
    fontWeight: "bold",
    letterSpacing: -0.2,
  },
  previewText: {
    fontSize: 12,
    color: "#9CADC8",
    letterSpacing: -0.17,
  },
  boldPreviewText: {
    fontSize: 12,
    letterSpacing: -0.17,
    fontWeight: 900,
  },
  bubble: {
    backgroundImage: 'linear-gradient(225deg, #6CC1FF 0%, #3A8DFF 100%)',
    borderRadius: '50%',
    height: 25,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noBubble: {
    hidden: 'true',
  },
  text: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: -0.2,
    padding: 8,
  },
}));

const ChatContent = ({ conversation, activelyTyping }) => {
  const classes = useStyles();

  const { unreadMsgCount, otherUser } = conversation;
  const latestMessageText = conversation.id && conversation.latestMessageText;

  return (
    <Box className={classes.root}>
      <Box>
        <Typography className={classes.username}>
          {otherUser.username}
        </Typography>
        <Typography className={(unreadMsgCount > 0 || activelyTyping.includes(conversation.id)) ? classes.boldPreviewText : classes.previewText}>
          {activelyTyping.includes(conversation.id) ? 'Typing...' : latestMessageText}
        </Typography>
      </Box>
      <Box className={unreadMsgCount > 0 ? classes.bubble : classes.noBubble}>
        <Typography className={classes.text}>{unreadMsgCount}</Typography>
      </Box>
    </Box>
  );
};

export default ChatContent;
