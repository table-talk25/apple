// File: MainActivity.java (CORRETTO)
package com.tabletalk.socialapp;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;

// Importa i plugin che stai usando
import com.codetrixstudio.capacitor.GoogleAuth.GoogleAuth;
import com.getcapacitor.community.applesignin.SignInWithApple;

import java.util.ArrayList;

public class MainActivity extends BridgeActivity {

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    // Inizializza i plugin qui
    registerPlugin(GoogleAuth.class);
    registerPlugin(SignInWithApple.class);
  }
}
