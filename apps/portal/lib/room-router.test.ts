import { describe, it, expect } from 'vitest';
import { classifyRoom } from './room-router';

describe('classifyRoom — internal Room navigation', () => {
  it.each([
    ['translate good morning to french', 'translate'],
    ['how do you say hello in spanish', 'translate'],
    ['what is the weather today', 'weather'],
    ["what's the forecast for tomorrow", 'weather'],
    ['do i need an umbrella', 'weather'],
    ["what's on my agenda", 'agenda'],
    ['show my calendar', 'agenda'],
    ['my next meeting', 'agenda'],
    ['give me the news', 'news'],
    ['latest headlines', 'news'],
    ['how are the markets doing', 'markets'],
    ['show my portfolio', 'markets'],
    ['look up the AAPL ticker', 'markets'],
    ['what is my net worth', 'wealth'],
    ['how much money do i have', 'wealth'],
    ['my savings', 'wealth'],
    ['how is my sleep', 'health'],
    ['log my run', 'health'],
    ["what's my heart rate", 'health'],
    ['note to self buy milk', 'remember'],
    ['remind me to call mum', 'remember'],
    ['link my account', 'connect'],
    ['pair a device', 'connect'],
    ['show me everything', 'home'],
    ['open the dashboard', 'home'],
  ])('routes %j → %s', (input, tab) => {
    expect(classifyRoom(input)?.tab).toBe(tab);
  });

  it('returns a human label alongside the tab', () => {
    expect(classifyRoom('what is my net worth')).toEqual({ tab: 'wealth', label: 'Wealth' });
  });

  describe('defers to /api/lar (returns null) for media + lookups', () => {
    it.each([
      'play Mr Brightside',
      'listen to the daily podcast',
      'put on some jazz',
      'queue up Taylor Swift',
      'define serendipity',
      'what does ephemeral mean',
      'where can i watch Dune',
      'recommend a good movie',
      'directions to Time Out Market',
      'find the book Project Hail Mary',
    ])('%j → null', (input) => {
      expect(classifyRoom(input)).toBeNull();
    });
  });

  describe('media-launch guard wins over a stray Room keyword', () => {
    it('"play Weather by ..." defers to media, not the Weather room', () => {
      expect(classifyRoom('play Weather by Janelle Monae')).toBeNull();
    });
    it('"play sleep sounds" defers to media, not the Health room', () => {
      expect(classifyRoom('play sleep sounds')).toBeNull();
    });
  });

  it('is case-insensitive and tolerant of padding', () => {
    expect(classifyRoom('  WHAT IS THE WEATHER  ')?.tab).toBe('weather');
  });

  it('returns null for empty / whitespace input', () => {
    expect(classifyRoom('')).toBeNull();
    expect(classifyRoom('   ')).toBeNull();
  });

  it('returns null for an unrelated request (handled elsewhere)', () => {
    expect(classifyRoom('book a flight to Tokyo')).toBeNull();
  });
});
