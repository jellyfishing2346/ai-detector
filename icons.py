from PIL import Image, ImageDraw
import math

def create_icon(size):
    img = Image.new('RGB', (size, size), '#0f172a')
    draw = ImageDraw.Draw(img)
    
    center = size // 2
    radius = size // 3
    circle_color = '#06b6d4'
    
    line_width = max(2, size // 16)
    draw.ellipse([center - radius, center - radius, center + radius, center + radius], 
                 outline=circle_color, width=line_width)
    
    for i in range(6):
        angle = (2 * math.pi / 6) * i
        x = center + int(math.cos(angle) * radius)
        y = center + int(math.sin(angle) * radius)
        node_radius = max(2, size // 20)
        draw.ellipse([x - node_radius, y - node_radius, x + node_radius, y + node_radius], 
                     fill=circle_color)
    
    center_radius = max(3, size // 12)
    draw.ellipse([center - center_radius, center - center_radius, 
                  center + center_radius, center + center_radius], fill=circle_color)
    
    return img

create_icon(16).save('icon16.png')
create_icon(48).save('icon48.png')
create_icon(128).save('icon128.png')