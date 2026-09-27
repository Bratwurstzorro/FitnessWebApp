import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { acceptsNumericDraft, parseNumeric } from './numeric.js'

test('weight accepts German decimal notation and rejects letters and exponent signs',()=>{
  for(const value of ['','0','72','72,5','72.50']) assert.equal(acceptsNumericDraft(value,'weight'),true,value)
  for(const value of ['72e3','72E3','72kg','+5','-2','7,123','1 0']) assert.equal(acceptsNumericDraft(value,'weight'),false,value)
  assert.equal(parseNumeric('72,5'),72.5)
})

test('repetitions accept only whole digits',()=>{
  for(const value of ['','1','12','100']) assert.equal(acceptsNumericDraft(value,'reps'),true,value)
  for(const value of ['12a','1,5','1.5','2e2','-1']) assert.equal(acceptsNumericDraft(value,'reps'),false,value)
})
