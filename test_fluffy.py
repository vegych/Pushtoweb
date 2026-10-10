import math
import random
import struct
import subprocess

WIDTH = 512
HEIGHT = 512

# We create an RGBA buffer
# buffer[y][x] = [r, g, b, a]
pixels = [[0.0, 0.0, 0.0, 0.0] for _ in range(WIDTH * HEIGHT)]

def set_pixel(x, y, r, g, b, a):
    if 0 <= x < WIDTH and 0 <= y < HEIGHT:
        idx = y * WIDTH + x
        # Alpha compositing over existing color
        cur_a = pixels[idx][3]
        out_a = a + cur_a * (1.0 - a)
        if out_a > 0:
            pixels[idx][0] = (r * a + pixels[idx][0] * cur_a * (1.0 - a)) / out_a
            pixels[idx][1] = (g * a + pixels[idx][1] * cur_a * (1.0 - a)) / out_a
            pixels[idx][2] = (b * a + pixels[idx][2] * cur_a * (1.0 - a)) / out_a
            pixels[idx][3] = out_a

print("Python test script loaded")
