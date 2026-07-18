import { useCallback, useState } from "react";
import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { FaceUploadScreen } from "@/components/face-upload-screen";
import { getFaces } from "@/lib/api-extensions";
import { colors } from "@/lib/theme";
import { useEffect } from "react";

export default function AjouterVisagePage() {
  const router = useRouter();
  const [faceCount, setFaceCount] = useState(0);

  useEffect(() => {
    getFaces({ limit: 1 })
      .then((result) => setFaceCount(result.total))
      .catch(() => {});
  }, []);

  const handleFaceAdded = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <View style={styles.container}>
      <FaceUploadScreen
        onFaceAdded={handleFaceAdded}
        currentCount={faceCount}
        maxCount={50}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
