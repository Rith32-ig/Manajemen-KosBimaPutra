import React from 'react';
import { NavigationContainer, NavigationIndependentTree, DefaultTheme } from '@react-navigation/native';
import type { Theme } from '@react-navigation/native';
import RootNavigator from '../screens/RootNavigator';

const navTheme: Theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: '#F8FAFC', card: '#FFFFFF', text: '#1E293B', border: '#E2E8F0', primary: '#2563EB' },
};

export default function Index() {
  return (
    <NavigationIndependentTree>
      <NavigationContainer theme={navTheme}>
        <RootNavigator />
      </NavigationContainer>
    </NavigationIndependentTree>
  );
}