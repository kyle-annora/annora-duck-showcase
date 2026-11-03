/** Small VP8/WebM writer for the offline authoring tool. No browser/scene state. */
const text = value => new TextEncoder().encode(value);
const join = arrays => { const out=new Uint8Array(arrays.reduce((n,a)=>n+a.length,0));let at=0;for(const a of arrays){out.set(a,at);at+=a.length;}return out; };
const id = value => new Uint8Array(value.match(/../g).map(byte=>parseInt(byte,16)));
function size(value){for(let length=1;length<=8;length++){if(value<2**(7*length)-1){const out=new Uint8Array(length);let n=value;for(let at=length-1;at>=0;at--){out[at]=n%256;n=Math.floor(n/256);}out[0]|=1<<(8-length);return out;}}throw new RangeError('WebM element is too large.');}
function uint(value){if(!Number.isSafeInteger(value)||value<0)throw new RangeError('Expected a nonnegative integer.');const bytes=[];do{bytes.unshift(value%256);value=Math.floor(value/256);}while(value);return new Uint8Array(bytes);}
const element=(key,value)=>join([id(key),size(value.length),value]);
const number=(key,value)=>element(key,uint(value));
const string=(key,value)=>element(key,text(value));
function float64(value){const bytes=new Uint8Array(8);new DataView(bytes.buffer).setFloat64(0,value,false);return bytes;}

export function createWebM({width,height,fps,duration,frames}){
  if(![width,height].every(v=>Number.isInteger(v)&&v>0)||!(fps>0)||!(duration>0)||!frames.length)throw new TypeError('A film needs dimensions, timing and encoded frames.');
  const header=element('1a45dfa3',join([number('4286',1),number('42f7',1),number('42f2',4),number('42f3',8),string('4282','webm'),number('4287',2),number('4285',2)]));
  const info=element('1549a966',join([number('2ad7b1',1000000),element('4489',float64(duration*1000)),string('4d80','Annora'),string('5741','Annora Explorer offline capture')]));
  const track=element('1654ae6b',element('ae',join([number('d7',1),number('73c5',1),number('83',1),string('86','V_VP8'),number('23e383',Math.round(1e9/fps)),element('e0',join([number('b0',width),number('ba',height)]))])));
  const clusters=[];let blocks=[],start=0,previous=-1;
  const flush=()=>{if(blocks.length)clusters.push(element('1f43b675',join([number('e7',start),...blocks])));blocks=[];};
  for(const frame of frames){
    const time=Math.round(frame.timestamp/1000);
    if(time<previous||!(frame.data instanceof Uint8Array))throw new TypeError('Encoded frames must have monotonic timestamps and bytes.');
    previous=time;
    if(blocks.length&&time-start>=4000&&frame.key){flush();start=time;}
    const relative=time-start;if(relative>32767)throw new RangeError('A keyframe is required within each cluster.');
    const prefix=new Uint8Array(4);prefix[0]=0x81;new DataView(prefix.buffer).setInt16(1,relative,false);prefix[3]=frame.key?0x80:0;
    blocks.push(element('a3',join([prefix,frame.data])));
  }
  flush();return join([header,element('18538067',join([info,track,...clusters]))]);
}
