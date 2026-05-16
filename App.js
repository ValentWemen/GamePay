import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Linking from 'expo-linking';
import { requestNotificationPermission } from './utils/notifications';

// Auth screens
import Splash from './user/Splash';
import Login from './user/Login';
import Register from './user/Register';
import ForgotPass from './user/ForgotPass';
import CustomerService from './user/CustomerService';

// Main screens
import Home from './main/Home';
import GameDetail from './main/GameDetail';
import History from './main/History';
import Group from './main/Group';
import GroupDetail from './main/GroupDetail';
import Account from './main/Account';
import Profile from './main/Profile';
import Payment from './main/Payment';
import Processing from './main/Processing';
import PaymentSuccess from './main/PaymentSuccess';
import News from './main/News';

// Settings screens
import HelpCenter from './user/HelpCenter';
import Terms from './user/Terms';
import ChangePassword from './user/ChangePassword';
import SecuritySettings from './user/SecuritySettings';

const RootStack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator();

function AuthFlow() {
  return (
    <AuthStack.Navigator
      screenOptions={{ headerShown: false, animation: 'fade' }}
      initialRouteName="Splash"
    >
      <AuthStack.Screen name="Splash" component={Splash} />
      <AuthStack.Screen name="Login" component={Login} />
      <AuthStack.Screen name="Register" component={Register} />
      <AuthStack.Screen name="ForgotPass" component={ForgotPass} />
    </AuthStack.Navigator>
  );
}

export default function App() {
  // Request permission notifikasi saat app pertama kali dibuka
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Deep linking config - URL bisa buka app langsung
  // Contoh: gamepay://join/GP-ABC123 atau https://gamepay.app/join/GP-ABC123
  const linking = {
    prefixes: [
      Linking.createURL('/'),
      'gamepay://',
      'https://gamepay.app',
    ],
    config: {
      screens: {
        Auth: {
          screens: {
            Login: 'login',
            Register: 'register',
          },
        },
        Home: 'home',
        GroupDetail: {
          path: 'join/:groupCode',
          parse: {
            groupCode: (code) => code,
          },
        },
        News: 'news',
        History: 'history',
        Group: 'group',
      },
    },
  };

  return (
    <SafeAreaProvider>
      <NavigationContainer linking={linking}>
        <RootStack.Navigator
          screenOptions={{ headerShown: false }}
          initialRouteName="Auth"
        >
          <RootStack.Screen name="Auth" component={AuthFlow} options={{ animation: 'fade' }} />

          {/* Main App Screens */}
          <RootStack.Screen name="Home" component={Home} options={{ animation: 'fade' }} />
          <RootStack.Screen name="GameDetail" component={GameDetail} options={{ animation: 'slide_from_right' }} />
          <RootStack.Screen name="History" component={History} options={{ animation: 'fade' }} />
          <RootStack.Screen name="Group" component={Group} options={{ animation: 'fade' }} />
          <RootStack.Screen name="GroupDetail" component={GroupDetail} options={{ animation: 'slide_from_right' }} />
          <RootStack.Screen name="CreateGroup" component={GroupDetail} options={{ animation: 'slide_from_right' }} />
          <RootStack.Screen name="Account" component={Account} options={{ animation: 'fade' }} />
          <RootStack.Screen name="EditProfile" component={Profile} options={{ animation: 'slide_from_right' }} />
          <RootStack.Screen name="Payment" component={Payment} options={{ animation: 'slide_from_right' }} />
          <RootStack.Screen name="Processing" component={Processing} options={{ animation: 'fade' }} />
          <RootStack.Screen name="PaymentSuccess" component={PaymentSuccess} options={{ animation: 'fade' }} />
          <RootStack.Screen name="News" component={News} options={{ animation: 'slide_from_right' }} />

          {/* Account sub-screens */}
          <RootStack.Screen name="HelpCenter" component={HelpCenter} options={{ animation: 'slide_from_right' }} />
          <RootStack.Screen name="Terms" component={Terms} options={{ animation: 'slide_from_right' }} />
          <RootStack.Screen name="ChangePassword" component={ChangePassword} options={{ animation: 'slide_from_right' }} />
          <RootStack.Screen name="SecuritySettings" component={SecuritySettings} options={{ animation: 'slide_from_right' }} />

          {/* Global modal */}
          <RootStack.Group screenOptions={{ presentation: 'modal' }}>
            <RootStack.Screen
              name="CustomerService"
              component={CustomerService}
              options={{ animation: 'slide_from_bottom', gestureEnabled: true }}
            />
          </RootStack.Group>
        </RootStack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
