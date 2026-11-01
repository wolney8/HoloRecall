import { describe, expect, it } from 'vitest';
import { ratingGestureDirection } from './study-rating-gesture';

describe('rating gesture direction',()=>{
  it('recomputes every direction from the current vector without latching the first preview',()=>{
    let direction=ratingGestureDirection(90,0,10);
    expect(direction).toBe('right');
    direction=ratingGestureDirection(-90,0,10,direction);
    expect(direction).toBe('left');
    direction=ratingGestureDirection(0,-110,10,direction);
    expect(direction).toBe('up');
    direction=ratingGestureDirection(0,110,10,direction);
    expect(direction).toBe('down');
    direction=ratingGestureDirection(-90,0,10,direction);
    expect(direction).toBe('left');
  });

  it('clears near the origin and uses modest axis hysteresis around diagonals',()=>{
    expect(ratingGestureDirection(4,3,10,'right')).toBe('');
    expect(ratingGestureDirection(45,45,10)).toBe('');
    expect(ratingGestureDirection(50,48,10,'right')).toBe('right');
    expect(ratingGestureDirection(38,-50,10,'right')).toBe('up');
    expect(ratingGestureDirection(-38,-50,10,'up')).toBe('up');
    expect(ratingGestureDirection(-50,-38,10,'up')).toBe('left');
  });
});
