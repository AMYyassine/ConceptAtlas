import {createContext,useContext,useEffect,useReducer,type Dispatch,type ReactNode} from 'react';
import {initialState,reducer,restore,serialize,type Action,type LabState} from './engine';
const Context=createContext<{state:LabState;dispatch:Dispatch<Action>}|null>(null);
function load(){try{const text=localStorage.getItem('conceptatlas-linked-example-v1');return text?restore(text):initialState();}catch{return initialState();}}
export function LabProvider({children}:{children:ReactNode}){const [state,dispatch]=useReducer(reducer,undefined,load);useEffect(()=>{try{localStorage.setItem('conceptatlas-linked-example-v1',serialize(state));}catch{/* Learning remains available when browser storage is disabled. */}},[state]);return <Context.Provider value={{state,dispatch}}>{children}</Context.Provider>;}
export function useLab(){const c=useContext(Context);if(!c)throw new Error('Lab context missing');return c;}
