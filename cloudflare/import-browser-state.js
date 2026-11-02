// The retired site sends only this app's browser state in a URL fragment.
// Fragments never reach the hosting server and are removed before QR generation.
if(location.hash.startsWith('#browser-migration=')){
  try{
    const encoded=location.hash.slice('#browser-migration='.length);
    if(encoded.length>2800000)throw Error('Migration too large');
    const data=JSON.parse(decodeURIComponent(encoded));
    if(data.version!==1||!Array.isArray(data.local)||!Array.isArray(data.session))throw Error('Invalid migration');
    const valid=key=>typeof key==='string'&&(key==='wheel-audiences-v2'||key.startsWith('audience-'));
    for(const [storage,entries] of [[localStorage,data.local],[sessionStorage,data.session]]){
      for(const entry of entries)if(Array.isArray(entry)&&entry.length===2&&valid(entry[0])&&typeof entry[1]==='string'&&storage.getItem(entry[0])===null)storage.setItem(entry[0],entry[1]);
    }
  }catch{console.warn('Some browser settings could not be transferred. Existing class rooms remain available.');}
  history.replaceState(null,'',location.pathname+location.search);
}
