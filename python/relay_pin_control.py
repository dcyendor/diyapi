#!/usr/bin/env python
import sys
import os
import RPi.GPIO as GPIO
import argparse
from datetime import datetime

system_log_file = "/var/log/diyapi/system.log"
directory = os.path.dirname(system_log_file)

SEV_DEBUG = 'DEBUG';
SEV_INFO = 'INFO';
SEV_WARN = 'WARN';
SEV_ERR = 'ERR';

LOG_TYPE_SYS = 'SYS';
LOG_TYPE_OPER = 'OPER';

def main():

    parser = argparse.ArgumentParser()
    parser.add_argument('pin',help="GPIO Pin (Required)")
    parser.add_argument('state', help="Set State.")
    args = parser.parse_args()
    return args.pin, args.state


def setup(pin):
    GPIO.setmode(GPIO.BOARD)
    GPIO.setwarnings(False)
    GPIO.setup(int(pin), GPIO.OUT)   # Set all pins' mode is output


def change_state(pin, state):

    if state == 'ON':
        GPIO.output(int(pin), GPIO.LOW)

    if state == 'OFF':
        GPIO.output(int(pin), GPIO.HIGH)


def destroy():
    GPIO.cleanup()                     # Release resource


def write_log_entry(script_name, type, severity, message):

    if not os.path.exists(directory):
        os.makedirs(directory)

    with open(system_log_file, "a") as f:
        time_stamp = datetime.now().strftime('%Y-%m-%d_%H:%M:%S')
        f.write("%s | %s | %s | %s, %s\n" % (str(time_stamp), type, severity, script_name, message))


if __name__ == '__main__':     # Program start from here
        pin, state = main()
        setup(pin)
        try:
                change_state(pin, state)
                write_log_entry(sys.argv[0], LOG_TYPE_SYS, SEV_INFO, "GPIO Change: Pin %s, State: %s" % (pin, state))

        except KeyboardInterrupt:  # When 'Ctrl+C' is pressed, the child program destroy() will be  executed.
                destroy()