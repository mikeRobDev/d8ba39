import React from 'react';
import { Box, Avatar } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { SenderBubble, OtherUserBubble } from '.';
import moment from 'moment';

const useStyles = makeStyles(() => ({
  avatar: {
    height: 20,
    width: 20,
    marginTop: 5,
    marginBottom: 5,
    float: 'right',
  },
}));

const Messages = (props) => {
  const { messages, otherUser, userId, recentRead, activelyTyping} = props;
  const classes = useStyles();

  return (
    <Box>
      {messages.map((message) => {
        const time = moment(message.createdAt).format('h:mm');

        return message.senderId === userId ? (
          //second conditional to add otherUser avatar underneath the last message they have read
          (message.text === recentRead ? (
            <div>
              <SenderBubble key={message.id} text={message.text} time={time} />
              <Avatar
                key={otherUser.id}
                alt={otherUser.username}
                src={otherUser.photoUrl}
                className={classes.avatar}
              />
            </div>
          ) : (
              <SenderBubble key={message.id} text={message.text} time={time} />
          ))

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
