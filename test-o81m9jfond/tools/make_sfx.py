import numpy as np, subprocess, wave, os
SR=44100
def env(n,a=0.005,r=0.2):
    t=np.arange(n)/SR; e=np.minimum(1,t/a)*np.exp(-t/r); return e
def save(name,x):
    x=x/np.max(np.abs(x))*0.9; d=(x*32767).astype(np.int16)
    w=wave.open('tmp.wav','wb');w.setnchannels(1);w.setsampwidth(2);w.setframerate(SR);w.writeframes(d.tobytes());w.close()
    subprocess.run(['ffmpeg','-y','-loglevel','error','-i','tmp.wav','-b:a','96k',f'game/assets/audio/{name}.mp3']);os.remove('tmp.wav')
rng=np.random.default_rng(1)
def lp(x,a): 
    y=np.zeros_like(x);acc=0
    for i,v in enumerate(x): acc+=a*(v-acc); y[i]=acc
    return y
def t(d): return np.arange(int(SR*d))/SR
# Cadillac: engine rev + double horn
T=t(1.1); f=55+70*np.minimum(1,T/0.5)
eng=np.sign(np.sin(2*np.pi*np.cumsum(f)/SR))*0.5+lp(rng.standard_normal(len(T)),0.08)*0.8
eng*=np.minimum(1,T/0.05)*np.exp(-np.maximum(0,T-0.7)/0.15)
horn=np.zeros_like(T)
for s,e_ in [(0.05,0.25),(0.32,0.62)]:
    m=(T>=s)&(T<e_); tt=T[m]-s
    horn[m]=(np.sign(np.sin(2*np.pi*370*tt))+np.sign(np.sin(2*np.pi*466*tt)))*0.35*np.minimum(1,tt/0.01)*np.minimum(1,(e_-s-tt)/0.02)
save('special_morgen',eng*0.7+horn)
# Tentacles: wet low sweep + squelch
T=t(0.7); n=rng.standard_normal(len(T))
sweep=np.sin(2*np.pi*np.cumsum(220-150*T/0.7)/SR+3*np.sin(2*np.pi*9*T))
sq=lp(n,0.05)*(1+np.sin(2*np.pi*14*T))
save('special_oxxxy',(sweep*0.6+sq*1.5)*env(len(T),0.03,0.35))
# KO boom
T=t(1.4); b=np.sin(2*np.pi*np.cumsum(90*np.exp(-T*2)+30)/SR)*env(len(T),0.002,0.5)+lp(rng.standard_normal(len(T)),0.2)*env(len(T),0.001,0.08)
save('ko',b)
# Block: short metallic thud
T=t(0.25); bl=(np.sin(2*np.pi*180*T)+0.5*np.sin(2*np.pi*1130*T)+0.3*np.sin(2*np.pi*1710*T))*env(len(T),0.001,0.05)+lp(rng.standard_normal(len(T)),0.3)*env(len(T),0.001,0.015)
save('block',bl)
# Round gong / start
T=t(1.6); g=sum(a*np.sin(2*np.pi*f*T) for f,a in [(196,1),(392.5,0.5),(523,0.35),(661,0.25),(1047,0.1)])*env(len(T),0.004,0.6)
save('round_start',g)
# Whoosh (jump / swing)
T=t(0.22); w_=lp(rng.standard_normal(len(T)),0.25)*np.sin(np.pi*T/0.22)**2
save('whoosh',w_)
