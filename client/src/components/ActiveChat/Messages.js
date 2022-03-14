import React from 'react';
import { Box, Avatar } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { SenderBubble, OtherUserBubble } from '.';
import moment from 'moment';

const useStyles = makeStyles(() => ({
  avatar: {
    height: 20,
    width: 20,
    float: 'right',
  },
  readWrapper: {
    paddingBottom: '25px',
  }
}));

const Messages = (props) => {
  const { messages, otherUser, userId, recentRead, activelyTyping} = props;
  const classes = useStyles();

  return (
    <Box>
      {messages.map((message) => {
        const time = moment(message.createdAt).format('h:mm');

        return message.senderId === userId ? (
          <Box className={message.text === recentRead ? classes.readWrapper : ""} key={message.id}>
            <SenderBubble text={message.text} time={time} />
            { message.text === recentRead && 
              <Avatar
                alt={otherUser.username}
                src={otherUser.photoUrl}
                className={classes.avatar}
              /> 
            }
          </Box>
        ) : (
          <OtherUserBubble
            key={message.id}
            text={message.text}
            time={time}
            otherUser={otherUser}
          />
        );
      })}
      { activelyTyping.includes(messages[0].conversationId) &&
        <OtherUserBubble
          key={otherUser.id}
          text={'...'}
          time={moment().format('h:mm')}
          otherUser={otherUser}
        />
      }
    </Box>
  );
};

export default Messages;
