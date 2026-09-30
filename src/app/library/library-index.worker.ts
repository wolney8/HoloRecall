/// <reference lib="webworker" />
import { buildLibraryIndex } from '../../domain/library';
import type { State } from '../../domain/models';

addEventListener('message',({data}:{data:{id:number;state:State}})=>{
  try{postMessage({id:data.id,index:buildLibraryIndex(data.state)});}catch(error){postMessage({id:data.id,error:error instanceof Error?error.message:'Library index could not be built.'});}
});
