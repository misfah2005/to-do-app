
import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  Animated,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

type TaskLocation = {
  latitude: number;
  longitude: number;
  address: string;
};

type Task = {
  id: string;
  title: string;
  completed: boolean;
  location?: TaskLocation;
};

type FilterType = "All" | "Active" | "Completed";
type ThemeType = "light" | "dark";

type ThemeColors = {
  card: string;
  text: string;
  secondary: string;
  delete: string;
  purple: string;
};

const STORAGE_KEY = "MY_TODO_TASKS";
const THEME_KEY = "MY_TODO_THEME";
const PENDING_LOCATION_KEY = "MY_TODO_PENDING_LOCATION";

function TaskRow({
  item,
  colors,
  onToggle,
  onDelete,
}: {
  item: Task;
  colors: ThemeColors;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  return (
    <Animated.View
      style={[
        styles.taskCard,
        {
          backgroundColor: colors.card,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Pressable
        style={styles.taskContent}
        onPress={() => onToggle(item.id)}
      >
        <Text style={styles.check}>
          {item.completed ? "✅" : "◯"}
        </Text>

        <View style={styles.taskDetails}>
          <Text
            style={[
              styles.taskText,
              { color: colors.text },
              item.completed && styles.completedText,
            ]}
          >
            {item.title}
          </Text>

          {item.location && (
            <Text style={[styles.taskLocation, { color: colors.secondary }]}>
              📍 {item.location.address}
            </Text>
          )}
        </View>
      </Pressable>

      <Pressable onPress={() => onDelete(item.id)}>
        <Text style={[styles.deleteButton, { color: colors.delete }]}>
          ✕
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const router = useRouter();

  const [task, setTask] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const [filter, setFilter] = useState<FilterType>("All");
  const [theme, setTheme] = useState<ThemeType>("light");
  const [isThemeLoaded, setIsThemeLoaded] = useState(false);

  const [selectedLocation, setSelectedLocation] =
    useState<TaskLocation | null>(null);

  const colors =
    theme === "dark"
      ? {
          background: "#151521",
          card: "#252538",
          text: "#FFFFFF",
          secondary: "#B0B0C0",
          input: "#252538",
          progressBackground: "#393950",
          purple: "#927BFF",
          delete: "#FF7777",
        }
      : {
          background: "#F5F5FA",
          card: "#FFFFFF",
          text: "#25233A",
          secondary: "#888899",
          input: "#FFFFFF",
          progressBackground: "#E8E5F5",
          purple: "#7057E8",
          delete: "#E05252",
        };

  useEffect(() => {
    async function loadData() {
      try {
        const savedTasks = await AsyncStorage.getItem(STORAGE_KEY);
        const savedTheme = await AsyncStorage.getItem(THEME_KEY);

        if (savedTasks !== null) {
          setTasks(JSON.parse(savedTasks));
        }

        if (savedTheme === "dark" || savedTheme === "light") {
          setTheme(savedTheme);
        }
      } catch (error) {
        console.log("Error loading data:", error);
      } finally {
        setIsLoaded(true);
        setIsThemeLoaded(true);
      }
    }

    loadData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      async function loadSelectedLocation() {
        try {
          const savedLocation = await AsyncStorage.getItem(
            PENDING_LOCATION_KEY
          );

          if (savedLocation !== null) {
            setSelectedLocation(JSON.parse(savedLocation));
            await AsyncStorage.removeItem(PENDING_LOCATION_KEY);
          }
        } catch (error) {
          console.log("Error loading selected location:", error);
        }
      }

      loadSelectedLocation();
    }, [])
  );

  useEffect(() => {
    async function saveTasks() {
      if (!isLoaded) return;

      try {
        await AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(tasks)
        );
      } catch (error) {
        console.log("Error saving tasks:", error);
      }
    }

    saveTasks();
  }, [tasks, isLoaded]);

  useEffect(() => {
    async function saveTheme() {
      if (!isThemeLoaded) return;

      try {
        await AsyncStorage.setItem(THEME_KEY, theme);
      } catch (error) {
        console.log("Error saving theme:", error);
      }
    }

    saveTheme();
  }, [theme, isThemeLoaded]);

  const totalTasks = tasks.length;

  const completedTasks = tasks.filter(
    (item) => item.completed
  ).length;

  const remainingTasks = totalTasks - completedTasks;

  const progressPercentage =
    totalTasks === 0
      ? 0
      : Math.round((completedTasks / totalTasks) * 100);

  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progressPercentage,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [progressPercentage, progressAnim]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  function toggleTheme() {
    setTheme((currentTheme) =>
      currentTheme === "light" ? "dark" : "light"
    );
  }

  function openLocationPicker() {
    router.push("/map?mode=pick" as any);
  }

  function addTask() {
    if (task.trim() === "") return;

    const newTask: Task = {
      id: Date.now().toString(),
      title: task.trim(),
      completed: false,
      ...(selectedLocation ? { location: selectedLocation } : {}),
    };

    setTasks((currentTasks) => [...currentTasks, newTask]);
    setTask("");
    setSelectedLocation(null);
  }

  function removeSelectedLocation() {
    setSelectedLocation(null);
  }

  function toggleTask(id: string) {
    setTasks((currentTasks) =>
      currentTasks.map((item) =>
        item.id === id
          ? { ...item, completed: !item.completed }
          : item
      )
    );
  }

  function deleteTask(id: string) {
    setTasks((currentTasks) =>
      currentTasks.filter((item) => item.id !== id)
    );
  }

  if (!isLoaded || !isThemeLoaded) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>
          Loading your tasks...
        </Text>
      </View>
    );
  }

  const filteredTasks = tasks.filter((item) => {
    if (filter === "Active") return !item.completed;
    if (filter === "Completed") return item.completed;
    return true;
  });

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background },
      ]}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.heading, { color: colors.text }]}>
            My Tasks 📝
          </Text>

          <Text style={[styles.subtitle, { color: colors.secondary }]}>
            Make today productive!
          </Text>
        </View>

        <View style={styles.headerButtons}>
          <Pressable
            style={styles.mapButton}
            onPress={() => router.push("/map" as any)}
          >
            <Text style={styles.mapButtonText}>📍 Map</Text>
          </Pressable>

          <Pressable
            style={[styles.themeButton, { backgroundColor: colors.card }]}
            onPress={toggleTheme}
          >
            <Text style={styles.themeIcon}>
              {theme === "light" ? "🌙" : "☀️"}
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.counterContainer}>
        <View style={[styles.counterCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.counterNumber, { color: colors.purple }]}>
            {totalTasks}
          </Text>
          <Text style={[styles.counterLabel, { color: colors.secondary }]}>
            Total
          </Text>
        </View>

        <View style={[styles.counterCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.counterNumber, { color: colors.purple }]}>
            {completedTasks}
          </Text>
          <Text style={[styles.counterLabel, { color: colors.secondary }]}>
            Completed
          </Text>
        </View>

        <View style={[styles.counterCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.counterNumber, { color: colors.purple }]}>
            {remainingTasks}
          </Text>
          <Text style={[styles.counterLabel, { color: colors.secondary }]}>
            Remaining
          </Text>
        </View>
      </View>

      <View style={[styles.progressContainer, { backgroundColor: colors.card }]}>
        <View style={styles.progressHeader}>
          <Text style={[styles.progressTitle, { color: colors.text }]}>
            Your Progress
          </Text>

          <Text style={[styles.progressPercentage, { color: colors.purple }]}>
            {progressPercentage}%
          </Text>
        </View>

        <View
          style={[
            styles.progressBackground,
            { backgroundColor: colors.progressBackground },
          ]}
        >
          <Animated.View
            style={[
              styles.progressFill,
              {
                backgroundColor: colors.purple,
                width: progressWidth,
              },
            ]}
          />
        </View>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: colors.input, color: colors.text },
          ]}
          placeholder="Enter a new task..."
          placeholderTextColor={colors.secondary}
          value={task}
          onChangeText={setTask}
        />

        <Pressable style={styles.addButton} onPress={addTask}>
          <Text style={styles.addButtonText}>+</Text>
        </Pressable>
      </View>

      <Pressable
        style={[
          styles.chooseLocationButton,
          { backgroundColor: colors.card },
        ]}
        onPress={openLocationPicker}
      >
        <Text style={[styles.chooseLocationText, { color: colors.purple }]}>
          📍 Choose Task Location
        </Text>
      </Pressable>

      {selectedLocation && (
        <View
          style={[
            styles.selectedLocationCard,
            { backgroundColor: colors.card },
          ]}
        >
          <View style={styles.selectedLocationInfo}>
            <Text style={[styles.selectedLocationTitle, { color: colors.text }]}>
              Selected location
            </Text>
            <Text style={[styles.selectedLocationAddress, { color: colors.secondary }]}>
              📍 {selectedLocation.address}
            </Text>
          </View>

          <Pressable onPress={removeSelectedLocation}>
            <Text style={[styles.removeLocation, { color: colors.delete }]}>
              Remove
            </Text>
          </Pressable>
        </View>
      )}

      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Today's Tasks
      </Text>

      <View style={styles.filterContainer}>
        {(["All", "Active", "Completed"] as FilterType[]).map((item) => (
          <Pressable
            key={item}
            style={[
              styles.filterButton,
              {
                backgroundColor:
                  filter === item ? colors.purple : colors.card,
              },
            ]}
            onPress={() => setFilter(item)}
          >
            <Text
              style={{
                color: filter === item ? "#FFFFFF" : colors.secondary,
                fontWeight: "600",
              }}
            >
              {item}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: colors.secondary }]}>
            No tasks found!
          </Text>
        }
        renderItem={({ item }) => (
          <TaskRow
            item={item}
            colors={colors}
            onToggle={toggleTask}
            onDelete={deleteTask}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 65,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  mapButton: {
    backgroundColor: "#7057E8",
    paddingHorizontal: 13,
    height: 45,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  mapButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 14,
  },
  heading: {
    fontSize: 30,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 15,
    marginTop: 8,
  },
  themeButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  themeIcon: {
    fontSize: 23,
  },
  counterContainer: {
    flexDirection: "row",
    gap: 10,
    marginTop: 24,
  },
  counterCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  counterNumber: {
    fontSize: 24,
    fontWeight: "bold",
  },
  counterLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  progressContainer: {
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  progressPercentage: {
    fontSize: 18,
    fontWeight: "bold",
  },
  progressBackground: {
    height: 10,
    borderRadius: 10,
    overflow: "hidden",
  },
  progressFill: {
    height: 10,
    borderRadius: 10,
  },
  inputContainer: {
    flexDirection: "row",
    marginTop: 20,
    gap: 10,
  },
  input: {
    flex: 1,
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: "#7057E8",
    width: 55,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 30,
  },
  chooseLocationButton: {
    marginTop: 10,
    padding: 13,
    borderRadius: 12,
    alignItems: "center",
  },
  chooseLocationText: {
    fontWeight: "bold",
    fontSize: 14,
  },
  selectedLocationCard: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectedLocationInfo: {
    flex: 1,
    marginRight: 8,
  },
  selectedLocationTitle: {
    fontWeight: "bold",
    fontSize: 13,
  },
  selectedLocationAddress: {
    fontSize: 12,
    marginTop: 5,
  },
  removeLocation: {
    fontWeight: "bold",
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: 21,
    fontWeight: "bold",
    marginTop: 22,
    marginBottom: 15,
  },
  filterContainer: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 15,
  },
  filterButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  taskCard: {
    padding: 17,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  taskContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  taskDetails: {
    flex: 1,
  },
  check: {
    fontSize: 20,
  },
  taskText: {
    fontSize: 16,
  },
  taskLocation: {
    fontSize: 12,
    marginTop: 5,
  },
  completedText: {
    textDecorationLine: "line-through",
    opacity: 0.6,
  },
  deleteButton: {
    fontSize: 20,
    paddingHorizontal: 8,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 30,
    fontSize: 15,
  },
});
