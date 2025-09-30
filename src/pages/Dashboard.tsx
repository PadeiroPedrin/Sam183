@@ .. @@
 import React, { useState, useEffect } from 'react';
 import { useAuth } from '../context/AuthContext';
-import StreamingPlayerSelector from '../components/players/StreamingPlayerSelector';
+import StreamingPlayerManager from '../components/players/StreamingPlayerManager';
 import PlaylistManager from '../components/PlaylistManager';
@@ .. @@
           <div className="bg-white rounded-lg shadow-sm p-6">
             <h2 className="text-xl font-semibold text-gray-800 mb-4">Player de Transmissão</h2>
-            <StreamingPlayerSelector />
+            <StreamingPlayerManager 
+              enableViewerCounter={true}
+              enableSocialSharing={true}
+              enableWatermark={true}
+              autoDetectStream={true}
+            />
           </div>
         </div>
@@ .. @@