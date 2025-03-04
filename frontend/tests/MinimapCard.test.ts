// tests/MinimapCard.test.ts
import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeAll, vi } from 'vitest'
import MinimapCard from '@/components/MinimapCard.vue'

// Sample data
const sampleProps = {
  player: {
    guid: 8,
    name: 'Alice',
    position: { x: 0, y: 0, o: 0 }
  },
  nearbyPlayers: [
    {
      guid: 9,
      name: 'Bob',
      position: { x: 29.864807760335594, y: 16.87820775073011, o: 0.18852991077176273 }
    }
  ]
}

// Create a mock canvas context with spies on drawing methods.
const createMockContext = () => ({
  clearRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  fillText: vi.fn(),
  strokeStyle: '',
  fillStyle: '',
  font: '',
  textAlign: ''
})

beforeAll(() => {
  // Mock getContext so that our drawing methods are spies.
  HTMLCanvasElement.prototype.getContext = vi.fn(() => createMockContext())
})

describe('MinimapCard.vue', () => {
  it('renders a canvas with correct dimensions', () => {
    const wrapper = mount(MinimapCard, {
      props: sampleProps
    })
    const canvas = wrapper.find('canvas').element as HTMLCanvasElement
    expect(canvas.width).toBe(480)
    expect(canvas.height).toBe(480)
  })

  it('calls drawing functions when props update', async () => {
    const wrapper = mount(MinimapCard, {
      props: sampleProps
    })
    // Because watchEffect will trigger drawing immediately,
    // we can get the context spy and test that clearRect or arc was called.
    const ctx = (wrapper.find('canvas').element as HTMLCanvasElement).getContext('2d')
    expect(ctx.clearRect).toHaveBeenCalled()
    expect(ctx.arc).toHaveBeenCalled()
  })
})
