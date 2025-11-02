import React from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import routes from './router'
const App = () => {
    console.log(routes)
  return (
    <BrowserRouter>
        <Routes>
            {routes.map((route) => {
                const {path, element} = route
                
                return (
                    <Route path={path} element={element}/>
                )

            })}
        </Routes>
    </BrowserRouter>
  )
}

export default App