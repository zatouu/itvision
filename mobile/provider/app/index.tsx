import { Text, View, TouchableOpacity } from 'react-native'
import { useEffect, useState } from 'react'

export default function Home(){
  const [api,setApi] = useState<string | null>(null)
  useEffect(()=>{ setApi(process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000') },[])
  return (
    <View style={{flex:1, alignItems:'center', justifyContent:'center', gap:8}}>
      <Text style={{fontSize:22, fontWeight:'700'}}>Itvision Provider</Text>
      <Text>API: {api}</Text>
      <TouchableOpacity style={{padding:12, backgroundColor:'#059669', borderRadius:10}}>
        <Text style={{color:'#fff'}}>Recevoir des demandes (bientôt)</Text>
      </TouchableOpacity>
    </View>
  )
}
