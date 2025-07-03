import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import Voice from '@react-native-voice/voice';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';

const App = () => {
  const [recognizedText, setRecognizedText] = useState('');
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    Voice.onSpeechResults = e => {
      if (e.value?.length) setRecognizedText(e.value[0]);
    };
    Voice.onSpeechStart = () => setIsListening(true);
    Voice.onSpeechEnd = () => setIsListening(false);
    Voice.onSpeechError = e => {
      setIsListening(false);
      console.error(e);
    };

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  const getMicPermission = async () => {
    const permission = Platform.select({
      android: PERMISSIONS.ANDROID.RECORD_AUDIO,
      ios: PERMISSIONS.IOS.MICROPHONE,
    });

    const status = await check(permission!);
    if (status === RESULTS.GRANTED) return true;

    if (status === RESULTS.DENIED) {
      const req = await request(permission!);
      return req === RESULTS.GRANTED;
    }

    if (status === RESULTS.BLOCKED) {
      Alert.alert(
        'Microphone Permission',
        'Please enable mic permission in Settings',
        [{ text: 'OK', onPress: () => Linking.openSettings() }],
      );
    }

    return false;
  };

  const toggleListening = async () => {
    const granted = await getMicPermission();
    if (!granted) return;

    try {
      if (isListening) {
        await Voice.stop();
      } else {
        setRecognizedText('');
        await Voice.start('en-US');
      }
    } catch (e) {
      console.error('Voice error:', e);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={toggleListening}>
        <Text style={styles.buttonText}>{isListening ? 'Stop' : 'Start'}</Text>
      </TouchableOpacity>
      <Text style={styles.text}>{recognizedText || 'Speak something...'}</Text>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  button: { backgroundColor: '#6200ee', padding: 20, borderRadius: 30 },
  buttonText: { color: '#fff', fontSize: 18 },
  text: { marginTop: 30, fontSize: 20, textAlign: 'center' },
});

export default App;
