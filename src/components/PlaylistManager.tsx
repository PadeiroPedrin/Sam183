@@ .. @@
   const startPlaylistTransmission = async (playlistId: number) => {
     try {
       setLoading(true);
       const token = await getToken();
       
       const response = await fetch('/api/streaming/start-playlist', {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           Authorization: `Bearer ${token}`
         },
         body: JSON.stringify({ 
-          playlist_id: playlistId 
+          playlist_id: playlistId,
+          user_login: user?.usuario || (user?.email ? user.email.split('@')[0] : `user_${user?.id || 'usuario'}`)
         })
       });
       
       const result = await response.json();
       if (result.success) {
-        toast.success('Transmissão de playlist iniciada!');
+        toast.success(`Transmissão de playlist iniciada! URL: https://stmv1.udicast.com/${user?.usuario || (user?.email ? user.email.split('@')[0] : `user_${user?.id || 'usuario'}`)}/playlist.m3u8`);
         loadPlaylists();
       } else {
         toast.error(result.error || 'Erro ao iniciar transmissão');
       }
     } catch (error) {
       console.error('Erro ao iniciar transmissão:', error);
       toast.error('Erro ao iniciar transmissão');
     } finally {
       setLoading(false);
     }
   };
@@ .. @@