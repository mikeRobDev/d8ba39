import React, { useCallback, useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { useHistory } from 'react-router-dom';
import { Grid, CssBaseline, Button } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';

import { SidebarContainer } from '../components/Sidebar';
import { ActiveChat } from '../components/ActiveChat';
import { SocketContext } from '../context/socket';

const useStyles = makeStyles((theme) => ({
  root: {
    height: '100vh',
  },
}));

const Home = ({ user, logout }) => {
  const history = useHistory();

  const socket = useContext(SocketContext);

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [typingStatus, setTypingStatus] = useState([]);

  const classes = useStyles();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  var timeout;

  const addSearchedUsers = (users) => {
    const currentUsers = {};

    // make table of current users so we can lookup faster
    conversations.forEach((convo) => {
      currentUsers[convo.otherUser.id] = true;
    });

    const newState = [...conversations];
    users.forEach((user) => {
      // only create a fake convo if we don't already have a convo with this user
      if (!currentUsers[user.id]) {
        let fakeConvo = { otherUser: user, messages: [] };
        newState.push(fakeConvo);
      }
    });

    setConversations(newState);
  };

  const clearSearchedUsers = () => {
    setConversations((prev) => prev.filter((convo) => convo.id));
  };

  const saveMessage = async (body) => {
    try {
      const { data } = await axios.post('/api/messages', body);

      if (!body.conversationId) {
        addNewConvo(body.recipientId, data.message);
      } else {
        addMessageToConversation(data);
      }

      sendMessage(data, body);
    } catch (error) {
      console.error(error);
    }
  };

  const sendMessage = (data, body) => {
    socket.emit('new-message', {
      message: data.message,
      recipientId: body.recipientId,
      sender: data.sender,
    });
  };

  const postMessage = (body) => {
    saveMessage(body);
  };

  const addNewConvo = useCallback(
    (recipientId, message) => {
      setConversations((prev) =>
        prev.map((convo) => {
          if (convo.otherUser.id === recipientId) {
            const convoCopy = { ...convo };
            convoCopy.messages = [ ...convoCopy.messages, message ];
            convoCopy.latestMessageText = message.text;
            convoCopy.id = message.conversationId;
            return convoCopy;
          } else {
            return convo;
          }
        })
      );
    }, []);

  const saveReceipt = useCallback((body) => {
    (async () => {
      try {
        const { data } = await axios.put('/api/messages', body);
        const { id, recentMessage } = data;
        setConversations((prev) =>
          prev.map((convo) => {
            if (convo.id === id) {
              const convoCopy = { ...convo };
              convoCopy.messages = convoCopy.messages.map((message) => {
                if (message.text === recentMessage){
                  message.readRecently = true;
                }
                return message;
              });
              convoCopy.unreadMsgCount = 0;
              return convoCopy;
            } else {
              return convo;
            }
          })
        );

        socket.emit('new-read', {
          conversationToUpdate: id,
          messageToUpdate: recentMessage,
        });
      } catch (error) {
        console.error(error);
      }
  })();
  }, [socket]);

  const sendReadReceipts = useCallback((username) => {
    let readConvo = conversations.find(
      (conversation) => conversation.otherUser.username === username
    );
    let readMessage = readConvo.messages.slice().reverse().find(
      (msg) => msg.senderId !== user.id
    );
    let tempBody = {
      convoId: readConvo.id,
      newestReceipt: readMessage.text,
    };

    saveReceipt(tempBody);
  }, [saveReceipt, conversations, user]);

  const addMessageToConversation = useCallback(
    (data) => {
      // if sender isn't null, that means the message needs to be put in a brand new convo
      const { message, sender = null } = data;
      if (sender !== null) {
        const newConvo = {
          id: message.conversationId,
          otherUser: sender,
          messages: [message],
          unreadMsgCount: 1,
        };
        newConvo.latestMessageText = message.text;
        setConversations((prev) => [newConvo, ...prev]);
      }

      setConversations((prev) =>
        prev.map((convo) => {
          if (convo.id === message.conversationId) {
            const convoCopy = { ...convo };
            convoCopy.messages = [ ...convoCopy.messages, message ];
            convoCopy.latestMessageText = message.text;
            if (message.senderId !== user.id && activeConversation !== convo.otherUser.username){
              convoCopy.unreadMsgCount = convo.unreadMsgCount + 1;
            }
            return convoCopy;
          } else {
            return convo;
          }
        })
      );

      let activelyReadConvo = conversations.find(
        (conversation) => conversation.id === message.conversationId
      );
      if (activeConversation === activelyReadConvo.otherUser.username){
        (async () => {
          sendReadReceipts(activeConversation);
        })()
      }
    }, [user, activeConversation, conversations, sendReadReceipts]);

  const setActiveChat = (username) => {
    setActiveConversation(username);

    sendReadReceipts(username);
  };

  const updateReadReceipts = useCallback(
    (data) => {
      const {convoToUpdate, msgToUpdate} = data;

      setConversations((prev) => 
        prev.map((convo) => {
          if (convo.id === convoToUpdate) {
            const convoCopy = { ...convo };
            convoCopy.mostRecentRead = msgToUpdate;
            return convoCopy;
          } else {
            return convo;
          }
        })
      );

    }, []);

  const updateTypingStatus = (convoId) => {
    socket.emit('new-typing-event', {
      typingConvo: convoId,
    });
  }

  const updateIncomingMessageStatus = useCallback(
    (data) => {
      const {convoId} = data;
      let typingConvos = [...typingStatus];
      if(!typingConvos.includes(convoId)){
        typingConvos.push(convoId); 
      }
      setTypingStatus(typingConvos);
      clearTimeout(timeout);
      timeout = setTimeout(function(){ setTypingStatus(typingStatus.filter((id) => id !== convoId))},5000);
    },
    [setTypingStatus, typingStatus]
  );


  const addOnlineUser = useCallback((id) => {
    setConversations((prev) =>
      prev.map((convo) => {
        if (convo.otherUser.id === id) {
          const convoCopy = { ...convo };
          convoCopy.otherUser = { ...convoCopy.otherUser, online: true };
          return convoCopy;
        } else {
          return convo;
        }
      })
    );
  }, []);

  const removeOfflineUser = useCallback((id) => {
    setConversations((prev) =>
      prev.map((convo) => {
        if (convo.otherUser.id === id) {
          const convoCopy = { ...convo };
          convoCopy.otherUser = { ...convoCopy.otherUser, online: false };
          return convoCopy;
        } else {
          return convo;
        }
      })
    );
  }, []);

  // Lifecycle

  useEffect(() => {
    // Socket init
    socket.on('add-online-user', addOnlineUser);
    socket.on('remove-offline-user', removeOfflineUser);
    socket.on('new-message', addMessageToConversation);
    socket.on('new-read', updateReadReceipts);
    socket.on('new-typing-event', updateIncomingMessageStatus);

    return () => {
      // before the component is destroyed
      // unbind all event handlers used in this component
      socket.off('add-online-user', addOnlineUser);
      socket.off('remove-offline-user', removeOfflineUser);
      socket.off('new-message', addMessageToConversation);
      socket.off('new-read', updateReadReceipts);
      socket.off('new-typing-event', updateIncomingMessageStatus);
    };
  }, [updateIncomingMessageStatus, updateReadReceipts, addMessageToConversation, addOnlineUser, removeOfflineUser, socket]);

  useEffect(() => {
    // when fetching, prevent redirect
    if (user?.isFetching) return;

    if (user && user.id) {
      setIsLoggedIn(true);
    } else {
      // If we were previously logged in, redirect to login instead of register
      if (isLoggedIn) history.push('/login');
      else history.push('/register');
    }
  }, [user, history, isLoggedIn]);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const { data } = await axios.get('/api/conversations');
        setConversations(data);
      } catch (error) {
        console.error(error);
      }
    };
    if (!user.isFetching) {
      fetchConversations();
    }
  }, [user]);

  const handleLogout = async () => {
    if (user && user.id) {
      await logout(user.id);
    }
  };

  return (
    <>
      <Button onClick={handleLogout}>Logout</Button>
      <Grid container component="main" className={classes.root}>
        <CssBaseline />
        <SidebarContainer
          conversations={conversations}
          user={user}
          clearSearchedUsers={clearSearchedUsers}
          addSearchedUsers={addSearchedUsers}
          setActiveChat={setActiveChat}
          activelyTyping={typingStatus}
        />
        <ActiveChat
          activeConversation={activeConversation}
          conversations={conversations}
          user={user}
          postMessage={postMessage}
          updateTypingStatus={updateTypingStatus}
          activelyTyping={typingStatus}
        />
      </Grid>
    </>
  );
};

export default Home;
