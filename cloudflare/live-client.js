// Hibernating notifications replace three-second snapshot polling.
let liveSocket=null,liveRoom='',liveRetry=null,liveRefresh=null,liveBackoff=1000;
function scheduleLiveRefresh(){
  clearTimeout(liveRefresh);
  liveRefresh=setTimeout(()=>{if(!roomId||document.hidden)return;if(busy||polling){scheduleLiveRefresh();return;}pollRoom();},busy?4200:150);
}
function connectLiveRoom(){
  if(!roomId||document.hidden)return;
  if(liveSocket&&liveRoom===roomId&&liveSocket.readyState<2)return;
  clearTimeout(liveRetry);if(liveSocket)liveSocket.close();
  liveRoom=roomId;
  const endpoint=new URL(CLASSROOM_API);endpoint.protocol=endpoint.protocol==='https:'?'wss:':'ws:';endpoint.pathname='/events';endpoint.search='?room='+encodeURIComponent(roomId);
  const socket=liveSocket=new WebSocket(endpoint);
  socket.onopen=()=>{liveBackoff=1000;scheduleLiveRefresh();};
  socket.onmessage=()=>scheduleLiveRefresh();
  socket.onclose=()=>{if(liveSocket!==socket)return;liveSocket=null;if(roomId&&!document.hidden){liveRetry=setTimeout(connectLiveRoom,liveBackoff);liveBackoff=Math.min(liveBackoff*2,30000);}};
  socket.onerror=()=>socket.close();
}
setInterval(()=>{if(roomId&&!document.hidden){connectLiveRoom();if(!liveSocket||liveSocket.readyState!==WebSocket.OPEN)pollRoom();}},30000);
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){clearTimeout(liveRetry);clearTimeout(liveRefresh);if(liveSocket){const socket=liveSocket;liveSocket=null;socket.close();}}
  else if(roomId){connectLiveRoom();scheduleLiveRefresh();}
});
window.addEventListener('pagehide',()=>{if(liveSocket)liveSocket.close();});
connectLiveRoom();
