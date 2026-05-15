from event_manager import *
from yolobit import *
button_a.on_pressed = None
button_b.on_pressed = None
button_a.on_pressed_ab = button_b.on_pressed_ab = -1
from homebit3_rgbled import RGBLed
from mqtt import *
from machine import RTC
import ntptime
import time
from homebit3_lcd1602 import LCD1602
import sys
import uselect
from machine import Pin, SoftI2C
from homebit3_dht20 import DHT20
import json

event_manager.reset()

tiny_rgb = RGBLed(pin0.pin, 4)

# Global variables - EXACTLY as in your provided code
Chu_E1_BB_97i_AI = ''
th_C3_B4ng_tin = ''
GDD = 0
RT = 0
MODE = 0
LUX = 0
L_E1_BB_87nh_AI = ''
Th_E1_BB_9Di_Gian = 0
RH = 0
SM = 0
PUMP1_STATE = 0 # Tracked for dashboard
PUMP2_STATE = 0 # Tracked for dashboard

def on_event_timer_callback_e_U_V_i_c():
  global Chu_E1_BB_97i_AI, th_C3_B4ng_tin, GDD, RT, MODE, LUX, L_E1_BB_87nh_AI, Th_E1_BB_9Di_Gian, RH, SM
  if MODE == 0:
    tiny_rgb.show(0, hex_to_rgb('#00ff00'))
  if MODE == 1:
    tiny_rgb.show(0, hex_to_rgb('#ffff00'))
  if MODE == 2:
    tiny_rgb.show(0, hex_to_rgb('#ff0000'))

event_manager.add_timer_event(1000, on_event_timer_callback_e_U_V_i_c)

lcd1602 = LCD1602()

def on_event_timer_callback_a_y_g_W_o():
  global Chu_E1_BB_97i_AI, th_C3_B4ng_tin, GDD, RT, MODE, LUX, L_E1_BB_87nh_AI, Th_E1_BB_9Di_Gian, RH, SM
  if LUX >= 2000:
    GDD = (GDD if isinstance(GDD, (int, float)) else 0) + 1
    mqtt.publish('V5', GDD)
  print('{' + '"x": ' + str(LUX) + '}')

event_manager.add_timer_event(60000, on_event_timer_callback_a_y_g_W_o)

def read_terminal_input():
  spoll=uselect.poll()
  spoll.register(sys.stdin, uselect.POLLIN)
  input = ''
  if spoll.poll(0):
    input = sys.stdin.read(1)
    while spoll.poll(0):
      input = input + sys.stdin.read(1)
  spoll.unregister(sys.stdin)
  return input

def on_event_timer_callback_Q_W_a_A_F():
  global Chu_E1_BB_97i_AI, th_C3_B4ng_tin, GDD, RT, MODE, LUX, L_E1_BB_87nh_AI, Th_E1_BB_9Di_Gian, RH, SM
  Chu_E1_BB_97i_AI = read_terminal_input()
  if len(Chu_E1_BB_97i_AI) > 0:
    L_E1_BB_87nh_AI = Chu_E1_BB_97i_AI[0]

event_manager.add_timer_event(2000, on_event_timer_callback_Q_W_a_A_F)

def on_event_timer_callback_j_w_Y_C_N():
  global Chu_E1_BB_97i_AI, th_C3_B4ng_tin, GDD, RT, MODE, LUX, L_E1_BB_87nh_AI, Th_E1_BB_9Di_Gian, RH, SM, PUMP1_STATE, PUMP2_STATE
  if MODE == 1 or MODE == 2:
    if SM < 50:
      pin10.write_digital((1))
      PUMP1_STATE = 1
      mqtt.publish('V10', '1')
    if SM > 80:
      pin10.write_digital((0))
      PUMP1_STATE = 0
      mqtt.publish('V10', '0')
  if MODE == 0:
    Th_E1_BB_9Di_Gian = (int(('%0*d' % (2, RTC().datetime()[4])))) / 60
    Th_E1_BB_9Di_Gian = (Th_E1_BB_9Di_Gian if isinstance(Th_E1_BB_9Di_Gian, (int, float)) else 0) + (int(('%0*d' % (2, RTC().datetime()[5]))))
    if Th_E1_BB_9Di_Gian > 420:
      pin13.write_digital((1))
      PUMP2_STATE = 1
      mqtt.publish('V11', '1')
    if Th_E1_BB_9Di_Gian > 435:
      pin13.write_digital((0))
      PUMP2_STATE = 0
      mqtt.publish('V11', '0')
    if Th_E1_BB_9Di_Gian > 840:
      pin13.write_digital((1))
      PUMP2_STATE = 1
      mqtt.publish('V11', '1')
    if Th_E1_BB_9Di_Gian > 870:
      pin13.write_digital((0))
      PUMP2_STATE = 0
      mqtt.publish('V11', '0')

event_manager.add_timer_event(2000, on_event_timer_callback_j_w_Y_C_N)

def on_mqtt_message_receive_callback__V10_(th_C3_B4ng_tin):
  global PUMP1_STATE
  if th_C3_B4ng_tin == '1':
    pin10.write_digital((1))
    PUMP1_STATE = 1
  else:
    pin10.write_digital((0))
    PUMP1_STATE = 0

def on_mqtt_message_receive_callback__V11_(th_C3_B4ng_tin):
  global PUMP2_STATE
  if th_C3_B4ng_tin == '1':
    pin13.write_digital((1))
    PUMP2_STATE = 1
  else:
    pin13.write_digital((0))
    PUMP2_STATE = 0

def on_mqtt_message_receive_callback__V7_(th_C3_B4ng_tin):
  global MODE
  if th_C3_B4ng_tin == '0':
    MODE = 0
  if th_C3_B4ng_tin == '1':
    MODE = 1
  if th_C3_B4ng_tin == '2':
    MODE = 2

def _C4_90_C4_83ng_K_C3_AD_K_C3_AAnh_D_E1_BB_AF_Li_E1_BB_87u():
  mqtt.on_receive_message('V10', on_mqtt_message_receive_callback__V10_)
  mqtt.on_receive_message('V11', on_mqtt_message_receive_callback__V11_)
  mqtt.on_receive_message('V7', on_mqtt_message_receive_callback__V7_)

dht20 = DHT20()

def on_event_timer_callback_T_U_a_j_H():
  global RT, RH, SM, LUX
  dht20.read_dht20()
  RT = dht20.dht20_temperature()
  RH = dht20.dht20_humidity()
  SM = translate((pin1.read_analog()), 0, 4096, 0, 100)
  LUX = pin2.read_analog()
  lcd1602.move_to(0, 0)
  lcd1602.putstr('RT:')
  lcd1602.move_to(3, 0)
  lcd1602.putstr(str(RT))
  lcd1602.move_to(7, 0)
  lcd1602.putstr('*C ')
  lcd1602.move_to(10, 0)
  lcd1602.putstr('RH:')
  lcd1602.move_to(13, 0)
  lcd1602.putstr(str(RH))
  lcd1602.move_to(15, 0)
  lcd1602.putstr('%')
  lcd1602.move_to(0, 1)
  lcd1602.putstr('LUX:')
  lcd1602.move_to(4, 1)
  lcd1602.putstr(str(LUX))
  lcd1602.move_to(10, 1)
  lcd1602.putstr('SM: ')
  lcd1602.move_to(13, 1)
  lcd1602.putstr(str(SM))
  lcd1602.move_to(15, 1)
  lcd1602.putstr('%')

event_manager.add_timer_event(30000, on_event_timer_callback_T_U_a_j_H)

def on_event_timer_callback_o_S_Y_c_N():
  global RT, RH, SM, LUX, GDD, MODE, PUMP1_STATE, PUMP2_STATE
  dht20.read_dht20()
  RT = dht20.dht20_temperature()
  RH = dht20.dht20_humidity()
  SM = translate((pin1.read_analog()), 0, 4096, 0, 100)
  LUX = pin2.read_analog()
  mqtt.publish('V1', RT)
  mqtt.publish('V2', RH)
  mqtt.publish('V3', SM)
  mqtt.publish('V4', LUX)
  
  # Dashboard Serial Output - V6 is set to 0 as in original logic
  print(json.dumps({
    'V1': RT, 'V2': RH, 'V3': SM, 'V4': LUX, 'V5': GDD,
    'V6': 0, 'V7': MODE, 'V10': PUMP1_STATE, 'V11': PUMP2_STATE
  }))

event_manager.add_timer_event(2000, on_event_timer_callback_o_S_Y_c_N)

def process_command(cmd_str):
  global MODE, PUMP1_STATE, PUMP2_STATE
  try:
    cmd_str = cmd_str.strip()
    if cmd_str.startswith('!') and cmd_str.endswith('#'):
      parts = cmd_str[1:-1].split(':')
      if len(parts) >= 2:
        prefix = parts[0].upper()
        value = int(parts[1])
        if prefix == 'MODE':
          MODE = value
        elif prefix == 'PUMP':
          pin10.write_digital(value)
          PUMP1_STATE = value
        elif prefix == 'PUMP2':
          pin13.write_digital(value)
          PUMP2_STATE = value
  except:
    pass

if True:
  display.scroll('YoLoFarm')
  display.set_all('#ffff00')
  mqtt.connect_wifi('HCMUT-MEETING', 'hcmut@meeting')
  mqtt.connect_broker(server='mqtt.ohstem.vn', port=1883, username='Final_Boss', password='')
  display.scroll('OK')
  ntptime.settime()
  (year, month, mday, week_of_year, hour, minute, second, milisecond) = RTC().datetime()
  RTC().init((year, month, mday, week_of_year, hour+7, minute, second, milisecond))
  lcd1602.clear()
  MODE = 0
  _C4_90_C4_83ng_K_C3_AD_K_C3_AAnh_D_E1_BB_AF_Li_E1_BB_87u()
  GDD = 0

while True:
  mqtt.check_message()
  cmd = read_terminal_input()
  if cmd:
    process_command(cmd)
  event_manager.run()
  time.sleep_ms(100)
  time.sleep_ms(10)
