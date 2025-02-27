import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  useColorScheme,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { alertApi } from '../services/api';
import { locationService } from '../services/location';
import { uploadService } from '../services/upload';
import { websocketService, WebSocketEvent } from '../services/websocket';
import { styles } from '../styles/dashboard'; // Previous styles

export default function DashboardScreen({ navigation }) {
  const isDark = useColorScheme() === 'dark';
  const [userId, setUserId] = useState<number | null>(null);
  const [stats, setStats] = useState({ total: 0, active: 0, resolved: 0 });
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [emergencyType, setEmergencyType] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  useEffect(() => {
    setupDashboard();
    return () => {
      locationService.stopWatchingLocation();
      websocketService.disconnect();
    };
  }, []);

  const setupDashboard = async () => {
    try {
      await setupLocation();
      setupWebSocket();
      await loadUserData();
    } catch (error) {
      console.error('Dashboard setup error:', error);
      Alert.alert('Error', 'Failed to setup dashboard');
    }
  };

  const setupLocation = async () => {
    const hasPermission = await locationService.requestPermissions();
    if (hasPermission) {
      locationService.watchLocation((newLocation) => {
        setLocation(newLocation);
      });
    }
  };

  const setupWebSocket = () => {
    websocketService.on(WebSocketEvent.ALERT_CREATED, (alert) => {
      setRecentAlerts((prev) => [alert, ...prev]);
      updateStats();
    });

    websocketService.on(WebSocketEvent.ALERT_UPDATED, (alert) => {
      setRecentAlerts((prev) =>
        prev.map((a) => (a.id === alert.id ? alert : a))
      );
      updateStats();
    });
  };

  const handleImageUpload = async () => {
    try {
      const file = await uploadService.pickImage();
      if (file) {
        setUploadedFiles((prev) => [...prev, file]);
      }
    } catch (error) {
      console.error('Image upload error:', error);
      Alert.alert('Error', 'Failed to upload image');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const file = await uploadService.takePhoto();
      if (file) {
        setUploadedFiles((prev) => [...prev, file]);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handleSubmitAlert = async () => {
    if (!userId || !emergencyType.trim() || !description.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      // Create alert
      const alert = await alertApi.createAlert({
        userId,
        type: emergencyType,
        description,
        status: 'active',
        priority: 'high',
        latitude: location?.latitude,
        longitude: location?.longitude,
      });

      // Upload attachments
      if (uploadedFiles.length > 0) {
        await Promise.all(
          uploadedFiles.map((file) =>
            uploadService.uploadFile(alert.id, file)
          )
        );
      }

      // Reset form
      setEmergencyType('');
      setDescription('');
      setUploadedFiles([]);
      Alert.alert('Success', 'Emergency alert has been created');

      // Refresh data
      loadDashboardData(userId);
    } catch (error) {
      console.error('Error creating alert:', error);
      Alert.alert('Error', 'Failed to create emergency alert');
    } finally {
      setLoading(false);
    }
  };

  // ... (previous methods remain the same)

  return (
    <SafeAreaView style={[styles.container, isDark && styles.darkContainer]}>
      <ScrollView>
        {/* Header */}
        <View style={[styles.header, isDark && styles.darkHeader]}>
          <Text style={[styles.welcomeText, isDark && styles.darkWelcomeText]}>
            Welcome, User
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          {/* ... (previous stats code) */}
        </View>

        {/* Recent Alerts */}
        <View style={styles.section}>
          {/* ... (previous alerts code) */}
        </View>

        {/* Report Emergency */}
        <View style={[styles.reportSection, isDark && styles.darkReportSection]}>
          <Text style={styles.reportTitle}>Report Emergency</Text>

          <TextInput
            style={[styles.input, isDark && styles.darkInput]}
            placeholder="Select emergency type"
            placeholderTextColor={isDark ? '#999' : '#666'}
            value={emergencyType}
            onChangeText={setEmergencyType}
          />

          <TextInput
            style={[styles.input, isDark && styles.darkInput]}
            placeholder="Describe the emergency situation"
            placeholderTextColor={isDark ? '#999' : '#666'}
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
          />

          {/* File Upload Buttons */}
          <View style={styles.uploadButtons}>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={handleImageUpload}
            >
              <Icon name="image" size={24} color="#fff" />
              <Text style={styles.uploadButtonText}>Upload Image</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.uploadButton}
              onPress={handleTakePhoto}
            >
              <Icon name="camera" size={24} color="#fff" />
              <Text style={styles.uploadButtonText}>Take Photo</Text>
            </TouchableOpacity>
          </View>

          {/* Uploaded Files Preview */}
          {uploadedFiles.length > 0 && (
            <View style={styles.uploadedFiles}>
              <Text style={styles.uploadedFilesTitle}>
                Uploaded Files: {uploadedFiles.length}
              </Text>
              {/* Add image previews here if needed */}
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmitAlert}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Send Emergency Alert</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Tab Bar */}
      <View style={[styles.tabBar, isDark && styles.darkTabBar]}>
        <TouchableOpacity style={styles.tab}>
          <Icon name="bell" size={24} color={isDark ? '#fff' : '#000'} />
          <Text style={[styles.tabText, isDark && styles.darkTabText]}>
            All Alerts
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab}>
          <Icon name="users" size={24} color={isDark ? '#fff' : '#000'} />
          <Text style={[styles.tabText, isDark && styles.darkTabText]}>
            Emergency Contacts
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}