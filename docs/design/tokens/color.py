import math
def to_lin(L,C,h):
    a=C*math.cos(math.radians(h)); b=C*math.sin(math.radians(h))
    l_=L+0.3963377774*a+0.2158037573*b; m_=L-0.1055613458*a-0.0638541728*b; s_=L-0.0894841775*a-1.2914855480*b
    l,m,s=l_**3,m_**3,s_**3
    return (4.0767416621*l-3.3077115913*m+0.2309699292*s,-1.2684380046*l+2.6097574011*m-0.3413193965*s,-0.0041960863*l-0.7034186147*m+1.7076147010*s)
def in_gamut(L,C,h,eps=1e-4): return all(-eps<=v<=1+eps for v in to_lin(L,C,h))
def max_chroma(L,h):
    lo,hi=0,0.4
    for _ in range(30):
        mid=(lo+hi)/2
        if in_gamut(L,mid,h): lo=mid
        else: hi=mid
    return lo
def Y(L,C,h):
    r,g,b=[max(0,min(1,v)) for v in to_lin(L,C,h)]
    return 0.2126*r+0.7152*g+0.0722*b
def hexc(L,C,h):
    def enc(x):
        x=max(0,min(1,x)); return 12.92*x if x<=0.0031308 else 1.055*x**(1/2.4)-0.055
    return '#'+''.join('%02x'%round(enc(v)*255) for v in to_lin(L,C,h))
def cr(y1,y2): return (max(y1,y2)+0.05)/(min(y1,y2)+0.05)
