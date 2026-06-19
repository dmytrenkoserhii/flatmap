import { useState } from 'react'

function App() {
  const [isConfirmed, setIsConfirmed] = useState(false)

  return (
    <button
      type="button"
      className="flatmap-button"
      onClick={() => setIsConfirmed(true)}
    >
      {isConfirmed ? 'React працює!' : 'FlatMap'}
    </button>
  )
}

export default App
