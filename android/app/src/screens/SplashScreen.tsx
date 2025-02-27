import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  SafeAreaView,
  useColorScheme,
} from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  darkContainer: {
    backgroundColor: '#1a1a1a',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: '#000',
  },
  darkTitle: {
    color: '#fff',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  darkSubtitle: {
    color: '#999',
  },
});

export default function SplashScreen({ navigation }) {
  const isDark = useColorScheme() === 'dark';

  useEffect(() => {
    // Auto-navigate to landing after 2 seconds
    const timer = setTimeout(() => {
      navigation.replace('Landing');
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <SafeAreaView style={[styles.container, isDark && styles.darkContainer]}>
      <Image
        source={require('../assets/app-icon.png')} // You'll need to add this
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={[styles.title, isDark && styles.darkTitle]}>
        AI Rapid Response
      </Text>
      <Text style={[styles.subtitle, isDark && styles.darkSubtitle]}>
        Campus Alert Safety System
      </Text>
    </SafeAreaView>
  );
}