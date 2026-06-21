import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('confirms that React works after a click', async () => {
    const user = userEvent.setup()

    render(<App />)
    const button = screen.getByRole('button', { name: 'FlatMap' })

    await user.click(button)

    expect(button).toHaveTextContent('React працює!')
  })
})
