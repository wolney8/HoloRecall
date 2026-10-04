import {describe,expect,it} from 'vitest';
import {hapticOperation,shouldPerformFeedback} from './interaction-feedback';

describe('semantic native feedback',()=>{
  it('uses supportive selection feedback for ratings and reserves error feedback for actual errors',()=>{
    expect(hapticOperation('rating-accepted')).toBe('selection');
    expect(hapticOperation('card-reveal')).toBe('light-impact');
    expect(hapticOperation('card-deal')).toBe('light-impact');
    expect(hapticOperation('session-complete')).toBe('success');
    expect(hapticOperation('cosmetic-unlock')).toBe('success');
    expect(hapticOperation('warning')).toBe('warning');
    expect(hapticOperation('error')).toBe('error');
  });
  it('suppresses feedback when disabled, unavailable, inactive, unfocused or previously failed',()=>{
    const ready={available:true,failed:false,enabled:true,active:true,focused:true};
    expect(shouldPerformFeedback(ready)).toBe(true);
    expect(shouldPerformFeedback({...ready,available:false})).toBe(false);
    expect(shouldPerformFeedback({...ready,failed:true})).toBe(false);
    expect(shouldPerformFeedback({...ready,enabled:false})).toBe(false);
    expect(shouldPerformFeedback({...ready,active:false})).toBe(false);
    expect(shouldPerformFeedback({...ready,focused:false})).toBe(false);
  });
});
