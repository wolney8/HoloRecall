import { describe, expect, it } from 'vitest';
import { adaptiveShortCandidate, graphemeCount, reducedMotion, surfaceVariables } from './card-effects';

describe('production card effects model',()=>{
  it('keeps Motion independent from decorative Effects',()=>{
    expect(reducedMotion('system',true)).toBe(true);
    expect(reducedMotion('full',true)).toBe(false);
    expect(reducedMotion('reduced',false)).toBe(true);
    const withEffects=surfaceVariables({x:.6,y:-.4,press:.5},'holo-rare',true,false);
    const withoutEffects=surfaceVariables({x:.6,y:-.4,press:.5},'holo-rare',false,false);
    expect(withEffects['--tilt-y']).toBe(withoutEffects['--tilt-y']);
    expect(Number(withEffects['--shimmer-strength'])).toBeGreaterThan(0);
    expect(withoutEffects['--shimmer-strength']).toBe('0.000');
  });

  it('derives pressure continuously from one numeric progress value without resetting tilt',()=>{
    const rest=surfaceVariables({x:.65,y:-.3,press:0},'ultra-rare',true,false);
    const middle=surfaceVariables({x:.65,y:-.3,press:.5},'ultra-rare',true,false);
    const pressed=surfaceVariables({x:.65,y:-.3,press:1},'ultra-rare',true,false);
    expect(middle['--tilt-x']).toBe(rest['--tilt-x']);
    expect(pressed['--tilt-y']).toBe(rest['--tilt-y']);
    expect(Number(middle['--press-scale'])).toBeLessThan(Number(rest['--press-scale']));
    expect(Number(middle['--press-scale'])).toBeGreaterThan(Number(pressed['--press-scale']));
    expect(Number(middle['--shadow-depth'])).toBeLessThan(Number(rest['--shadow-depth']));
    expect(Number(middle['--shadow-depth'])).toBeGreaterThan(Number(pressed['--shadow-depth']));
  });

  it('classifies adaptive short candidates by Unicode graphemes rather than code units',()=>{
    expect(graphemeCount('L’')).toBe(2);
    expect(graphemeCount('O₂')).toBe(2);
    expect(graphemeCount('👩🏽‍💻')).toBe(1);
    for(const value of ['L’','CE','x=4','WWW','iii','[]'])expect(adaptiveShortCandidate(value)).toBe(true);
    expect(adaptiveShortCandidate('ABCDE')).toBe(false);
    expect(adaptiveShortCandidate('x\n=4')).toBe(false);
  });
});
