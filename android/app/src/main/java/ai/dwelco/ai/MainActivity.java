package ai.dwelco.ai;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.provider.Settings;
import android.util.Log;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import com.google.firebase.messaging.FirebaseMessaging;

import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import java.io.IOException;

public class MainActivity extends BridgeActivity {

    private static final int NOTIFICATION_PERMISSION_CODE = 123;
    private final OkHttpClient client = new OkHttpClient();
    private static final String SERVER_URL = "http://10.0.2.2:3000/register-token";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Push notification plumbing
        requestNotificationPermission();
        createNotificationChannel();
        getAndLogFCMToken();
    }

    private void createNotificationChannel() {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            String channelId = "dwelco_notifications_v2";
            android.app.NotificationManager notificationManager = getSystemService(android.app.NotificationManager.class);
            android.app.NotificationChannel channel = new android.app.NotificationChannel(channelId,
                    "Alert Notifications",
                    android.app.NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription("Priority notifications from Dwelco");
            channel.enableLights(true);
            channel.enableVibration(true);
            notificationManager.createNotificationChannel(channel);
        }
    }

    private void requestNotificationPermission() {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.POST_NOTIFICATIONS}, NOTIFICATION_PERMISSION_CODE);
            }
        }
    }

    private void getAndLogFCMToken() {
        try {
            FirebaseMessaging.getInstance().getToken()
                .addOnCompleteListener(task -> {
                    if (!task.isSuccessful()) {
                        Log.w("FCM", "Fetching FCM registration token failed", task.getException());
                        return;
                    }
                    String token = task.getResult();
                    Log.d("FCM", "FCM Token: " + token);
                    
                    // Identify the user
                    String androidId = Settings.Secure.getString(getContentResolver(), Settings.Secure.ANDROID_ID);
                    String userId = android.os.Build.MODEL + "_" + (androidId != null ? androidId.substring(0, 4) : "dev");
                    
                    sendTokenToServer(token, userId);
                });
        } catch (Exception e) {
            Log.e("FCM", "Firebase not initialized. Make sure google-services.json is present.", e);
        }
    }

    private void sendTokenToServer(String token, String userId) {
        MediaType JSON = MediaType.get("application/json; charset=utf-8");
        String json = "{\"token\":\"" + token + "\", \"userId\":\"" + userId + "\"}";
        
        RequestBody body = RequestBody.create(json, JSON);
        Request request = new Request.Builder()
                .url(SERVER_URL)
                .post(body)
                .build();

        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
                Log.e("ServerLink", "Failed to send token to server", e);
            }

            @Override
            public void onResponse(Call call, Response response) throws IOException {
                if (response.isSuccessful()) {
                    Log.d("ServerLink", "Registered as user: " + userId);
                } else {
                    Log.w("ServerLink", "Server rejected token: " + response.code());
                }
            }
        });
    }
}
