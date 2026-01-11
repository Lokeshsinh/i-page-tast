import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import MapInterface from './Components/maps/MapInterface'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
    <MapInterface />
      
    </>
  )
}

export default App
