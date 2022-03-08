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
    const { data } = await axios.post('/api/messages', body);
    return data;
  };

  const sendMessage = (data, body) => {
    socket.emit('new-message', {
      message: data.message,
      recipientId: body.recipientId,
      sender: data.sender,
    });
  };

  const postMessage = (body) => {
    //use .then() method to ensure that the Promise is fulfilled before we continue with our handler actions for the post request
    saveMessage(body).then((data) => {
      if (!body.conversationId) {
        addNewConvo(body.recipientId, data.message);
      } else {
        addMessageToConversation(data);
      }

      sendMessage(data, body);
    }).catch (error => console.error(error));
  }

  const addNewConvo = useCallback(
    (recipientId, message) => {
      let extendedConvos = [...conversations];
      extendedConvos.forEach((convo) => {
        if (convo.otherUser.id === recipientId) {
          convo.messages.push(message);
          convo.latestMessageText = message.text;
          convo.id = message.conversationId;
        }
      });
      setConversations(extendedConvos);
    },
    [setConversations, conversations]
  );

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

      let progressingConvos = [...conversations];
      progressingConvos.forEach((convo) => {
        if (convo.id === message.conversationId) {
          convo.messages.push(message);
          convo.latestMessageText = message.text;
          //only update the unreadMsgCount for a user that is not actively viewing the conversation we just updated (otherwise they read it on receipt)
          if (message.senderId !== user.id && activeConversation !== convo.otherUser.username){
            convo.unreadMsgCount = convo.unreadMsgCount + 1;
          }else if (message.senderId !== user.id){
            convo.mostRecentRead = message.text;
          }
        }
      });
      setConversations(progressingConvos);
    },
    [setConversations, conversations, user, activeConversation]
  );

  const saveReceipt = async (body) => {
    const { data } = await axios.put('/api/conversations', body);
    return data;
  };

  const setActiveChat = (username) => {
    setActiveConversation(username);

    //setting a new active chat (loading the conversation with the given username) also updates the mostRecentRead 
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

    saveReceipt(tempBody).then((data) => {
      //update the client's readReceipts for re-rendering of Sidebar and ActiveChat component elements
      let readerConvos = [...conversations];
      readerConvos.forEach((convo) => {
        if (convo.id === data.id) {
          convo.mostRecentRead = readMessage.text;
          convo.unreadMsgCount = 0;
        }
      });
      setConversations(readerConvos);

      socket.emit('new-read', {
        conversationToUpdate: readConvo.id,
        messageToUpdate: readMessage.text,
      });
    });
  };

  const updateReadReceipts = useCallback(
    (data) => {
      const {convoToUpdate, msgToUpdate} = data;

      let viewingConvos = [...conversations];
      viewingConvos.forEach((convo) => {
        if (convo.id === convoToUpdate) {
          convo.mostRecentRead = msgToUpdate;
        }
      });
      setConversations(viewingConvos);
    },
    [setConversations, conversations]
  );

  const updateTypingStatus = (convoId) => {
    socket.emit('new-typing-event', {
      typingConvo: convoId,
    });
  }

  //socket handler to notify our client of other users that are currently typing within our conversations
  const updateIncomingMessageStatus = useCallback(
    (data) => {
      const {convoId} = data;
      let typingConvos = [...typingStatus];
      if(!typingConvos.includes(convoId)){
        typingConvos.push(convoId); 
      }
      setTypingStatus(typingConvos);
      //reset the typing status update after 5 seconds without additional input
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
