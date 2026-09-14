#pragma once
#include <Arduino.h>
#include "sensors.h"
#include "device_config.h"

struct BufferedReading {
  SensorReading values;
  char timestamp[25];   // ISO-8601, e.g. "2024-01-15T10:30:00Z"
  bool used;
};

static BufferedReading _buf[BUFFER_CAPACITY];
static uint8_t _head = 0;
static uint8_t _count = 0;

inline void bufferPush(const SensorReading& r, const char* ts) {
  _buf[_head] = { r, {}, true };
  strncpy(_buf[_head].timestamp, ts, sizeof(_buf[_head].timestamp) - 1);
  _head = (_head + 1) % BUFFER_CAPACITY;
  if (_count < BUFFER_CAPACITY) _count++;
}

inline bool bufferEmpty() { return _count == 0; }

// Iterate buffered readings oldest-first; call flush() after each successful POST
inline BufferedReading* bufferPeek() {
  if (_count == 0) return nullptr;
  uint8_t tail = (_head - _count + BUFFER_CAPACITY) % BUFFER_CAPACITY;
  return &_buf[tail];
}

inline void bufferPop() {
  if (_count > 0) _count--;
}

inline uint8_t bufferSize() { return _count; }
