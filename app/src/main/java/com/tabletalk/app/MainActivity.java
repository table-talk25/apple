package com.tabletalk.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import java.util.ArrayList;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Inizializza i plugin di Google e Apple
        registerPlugin(com.getcapacitor.plugins.googlemaps.GoogleMapsPlugin.class);
        registerPlugin(com.getcapacitor.plugins.applepay.ApplePayPlugin.class);
    }
}
