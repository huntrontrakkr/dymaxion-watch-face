// Only acknowledged data is safe to omit. This cache lasts for this companion
// session and is cleared by a watch launch/reconnect/full-sync request.
export function watchSync({send,delay=setTimeout,log=console.log}){
  const queue=[],acknowledged=new Map();let sending=false,generation=0;
  function flush(){
    if(sending)return;
    while(queue.length){
      const item=queue.shift();
      if(item.generation===generation&&acknowledged.get(item.kind)===item.signature)continue;
      sending=true;
      send(item.message,()=>{
        if(item.generation===generation)acknowledged.set(item.kind,item.signature);
        sending=false;flush();
      },()=>{
        // A failed ACK can mean uncertain delivery. The previous value is no
        // longer a reliable description of what is on the watch either.
        if(item.generation===generation)acknowledged.delete(item.kind);
        sending=false;
        if(item.retries++<3){
          if(!queue.some(next=>next.kind===item.kind))queue.unshift(item);
          delay(flush,1000*item.retries);
        }else{log('Watch sync deferred until the next connection.');flush();}
      });
      return;
    }
  }
  return {
    enqueue(kind,message){
      const item={kind,message,signature:JSON.stringify(message),generation,retries:0};
      const index=queue.findIndex(pending=>pending.kind===kind);
      if(index<0)queue.push(item);else queue[index]=item;
      flush();
    },
    forgetAcknowledged(){generation++;acknowledged.clear();}
  };
}
