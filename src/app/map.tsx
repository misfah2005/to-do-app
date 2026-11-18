
import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from "react-native";

import MapView, {
  Marker,
  Region,
  MapPressEvent,
} from "react-native-maps";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";

const PENDING_LOCATION_KEY = "MY_TODO_PENDING_LOCATION";

const DEFAULT_REGION: Region = {
  latitude: 6.9271,
  longitude: 79.8612,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

type TaskLocation = {
  latitude: number;
  longitude: number;
  address: string;
};

export default function MapScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const isPickerMode = params.mode === "pick";

  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [selectedLocation, setSelectedLocation] =
    useState<TaskLocation | null>(null);

  const [loading, setLoading] = useState(!isPickerMode);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function getCurrentLocation() {
    try {
      setLoading(true);
      setErrorMessage("");

      const permission =
        await Location.requestForegroundPermissionsAsync();

      if (!permission.granted) {
        setPermissionGranted(false);
        setErrorMessage(
          "Location permission not granted. You can still select a place on the map."
        );
        return;
      }

      setPermissionGranted(true);

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const newRegion: Region = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

      setRegion(newRegion);

      if (!isPickerMode) {
        setSelectedLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          address: "Your current location",
        });
      }
    } catch (error) {
      console.log("Location error:", error);
      setErrorMessage("Unable to get your current location.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isPickerMode) {
      getCurrentLocation();
    }
  }, [isPickerMode]);

  async function selectLocation(event: MapPressEvent) {
    if (!isPickerMode) return;

    const { latitude, longitude } = event.nativeEvent.coordinate;

    setSelectedLocation({
      latitude,
      longitude,
      address: "Getting address...",
    });

    try {
      const results = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (results.length > 0) {
        const place = results[0];

        const addressParts = [
          place.name,
          place.street,
          place.district,
          place.city,
          place.region,
          place.country,
        ].filter(
          (part, index, array) =>
            Boolean(part) && array.indexOf(part) === index
        );

        setSelectedLocation({
          latitude,
          longitude,
          address:
            addressParts.join(", ") ||
            `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
        });
      } else {
        setSelectedLocation({
          latitude,
          longitude,
          address: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
        });
      }
    } catch (error) {
      console.log("Reverse geocoding error:", error);

      setSelectedLocation({
        latitude,
        longitude,
        address: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
      });
    }
  }

  async function confirmLocation() {
    if (!selectedLocation) return;

    try {
      await AsyncStorage.setItem(
        PENDING_LOCATION_KEY,
        JSON.stringify(selectedLocation)
      );

      router.back();
    } catch (error) {
      console.log("Error saving selected location:", error);
      setErrorMessage("Could not save this location. Please try again.");
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>
        {isPickerMode ? "Choose Task Location" : "My Map"}
      </Text>

      <Text style={styles.subtitle}>
        {isPickerMode
          ? "Tap anywhere on the map to select a place"
          : "View your current location"}
      </Text>

      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          initialRegion={DEFAULT_REGION}
          region={region}
          onRegionChangeComplete={setRegion}
          onPress={selectLocation}
          showsUserLocation={permissionGranted}
          showsMyLocationButton={!isPickerMode}
        >
          {selectedLocation && (
            <Marker
              coordinate={{
                latitude: selectedLocation.latitude,
                longitude: selectedLocation.longitude,
              }}
              title="Selected location"
              description={selectedLocation.address}
            />
          )}
        </MapView>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7057E8" />
          <Text style={styles.message}>
            Getting your location...
          </Text>
        </View>
      )}

      {!loading && errorMessage !== "" && (
        <Text style={styles.error}>{errorMessage}</Text>
      )}

      {isPickerMode ? (
        <View style={styles.pickerFooter}>
          <Text style={styles.selectedText}>
            {selectedLocation
              ? `📍 ${selectedLocation.address}`
              : "Tap the map to choose a location"}
          </Text>

          <Pressable
            style={[
              styles.confirmButton,
              !selectedLocation && styles.disabledButton,
            ]}
            onPress={confirmLocation}
            disabled={!selectedLocation}
          >
            <Text style={styles.buttonText}>
              Use This Location
            </Text>
          </Pressable>
        </View>
      ) : (
        <>
          <Pressable
            style={styles.locationButton}
            onPress={getCurrentLocation}
          >
            <Text style={styles.buttonText}>
              Get My Current Location
            </Text>
          </Pressable>

          <Text style={styles.coordinates}>
            Latitude: {region.latitude.toFixed(5)}
            {"\n"}
            Longitude: {region.longitude.toFixed(5)}
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5FA",
    padding: 20,
    paddingTop: 60,
  },
  heading: {
    fontSize: 27,
    fontWeight: "bold",
    color: "#25233A",
  },
  subtitle: {
    fontSize: 14,
    color: "#888899",
    marginTop: 7,
    marginBottom: 20,
  },
  mapContainer: {
    flex: 1,
    overflow: "hidden",
    borderRadius: 18,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: "center",
    padding: 12,
  },
  message: {
    marginTop: 8,
    color: "#777777",
  },
  error: {
    color: "#D94343",
    textAlign: "center",
    marginTop: 12,
  },
  locationButton: {
    backgroundColor: "#7057E8",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 15,
  },
  pickerFooter: {
    paddingTop: 15,
  },
  selectedText: {
    color: "#555566",
    fontSize: 13,
    marginBottom: 12,
    textAlign: "center",
  },
  confirmButton: {
    backgroundColor: "#7057E8",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  disabledButton: {
    opacity: 0.45,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 15,
  },
  coordinates: {
    color: "#555566",
    fontSize: 13,
    textAlign: "center",
    marginTop: 15,
    lineHeight: 22,
  },
});
