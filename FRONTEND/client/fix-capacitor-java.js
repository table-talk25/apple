#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const capacitorBuildFile = path.join(__dirname, 'android/app/capacitor.build.gradle');

if (fs.existsSync(capacitorBuildFile)) {
    let content = fs.readFileSync(capacitorBuildFile, 'utf8');
    
    // Replace Java 21 with Java 17
    content = content.replace(/JavaVersion\.VERSION_21/g, 'JavaVersion.VERSION_17');
    
    fs.writeFileSync(capacitorBuildFile, content);
    console.log('✅ Fixed capacitor.build.gradle to use Java 17');
} else {
    console.log('❌ capacitor.build.gradle not found');
}
