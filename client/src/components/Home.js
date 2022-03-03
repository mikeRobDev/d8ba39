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

  const classes = useStyles();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

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

  //new message posted to server, front-end should display this message in related components without refresh
  const saveMessage = async (body) => {
    const { data } = await axios.post('/api/messages', body);
    //once the above Promise has resolved, we send the new message data to the sendMessage() method to emit a signal on our socket to run the new-message handler function
    //sendMessage(data, body);
    if (!body.conversationId) {
      addNewConvo(body.recipientId, data.message);
    } else {
      addMessageToConversation(data);
    }
    return data;
  };

  //the socket architecture relating to sendMessage ('new-message') has been hidden due to the problems it causes when emitting/receiving signals within a single socket (no cooperation with a server-side equivalent limits usefulness)
  /*const sendMessage = (data, body) => {
    socket.emit('new-message', {
      message: data.message,
      recipientId: body.recipientId,
      sender: data.sender,
    });
  };*/

  const postMessage = (body) => {
    try {
      //API request to server
      const data = saveMessage(body);
      //here we should either utilize the socket to emit a new-messsage using the request body (would rather use the response as it will ensure validation of new message, but would have to move emit action to server)
      //maybe call inside saveMessage?
    } catch (error) {
      console.error(error);
    }
  };

  const addNewConvo = useCallback(
    (recipientId, message) => {
      // if recipientId isn't null, that means the message needs to be put in a brand new convo
      if (message.sender !== null) {
        //iterate through the conversations list, editing the conversation with an empty conversationId that matches the recipientId (fakeConvo) generated earlier to account for the new message
        conversations.forEach((convo) => {
          if (convo.otherUser.id === recipientId) {
            convo.messages.push(message);
            convo.latestMessageText = message.text;
            convo.id = message.conversationId;
          }
        });
        setConversations([...conversations]);
      }
    },
    [setConversations, conversations]
  );

  const addMessageToConversation = useCallback(
    (data) => {
      //iterates through the conversations list, editing the conversation matching the active conversationId and updating it with the new message
      conversations.forEach((convo) => {
        if (convo.id === data.message.conversationId) {
          convo.messages.push(data.message);
          convo.latestMessageText = data.message.text;
        }
      });
      //passing a new object to setConversations to ensure a re-render of the components dependent on it as a prop
      setConversations([...conversations]);
    },
    [setConversations, conversations]
  );

  const setActiveChat = (username) => {
    setActiveConversation(username);
  };

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
    //socket.on('new-message', addMessageToConversation);

    return () => {
      // before the component is destroyed
      // unbind all event handlers used in this component
      socket.off('add-online-user', addOnlineUser);
      socket.off('remove-offline-user', removeOfflineUser);
      //socket.off('new-message', addMessageToConversation);
    };
  }, [addMessageToConversation, addOnlineUser, removeOfflineUser, socket]);

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
        />
        <ActiveChat
          activeConversation={activeConversation}
          conversations={conversations}
          user={user}
          postMessage={postMessage}
        />
      </Grid>
    </>
  );
};

export default Home;
