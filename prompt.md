Use claude-sonnet-4-5 for this task.

The login page hero image loads slowly on Vercel. Fix this:

**1. Convert the image to WebP**
In the terminal, run this to check the current image file name and size:
ls -lh public/ && find src/assets -type f | head -20
Then convert it to WebP using:
cwebp -q 80 <current-image-path> -o public/robot-hero.webp
If cwebp is not installed: ffmpeg -i <current-image-path> -q:v 80 public/robot-hero.webp
If neither is available, use Python:
python3 -c "from PIL import Image; img=Image.open('<path>'); img.save('public/robot-hero.webp', 'webp', quality=80)"

**2. Update the Login component**
Replace the current <img> or background-image reference with:
- Use an <img> tag (not CSS background) with:
  - src="robot-hero.webp"
  - loading="eager" (it's above the fold)
  - fetchpriority="high"
  - A small base64 placeholder as a blurred background while loading (generate a 10px thumbnail)
- Or if it's a CSS background-image, switch to an <img> tag for better browser optimization

**3. Add to vite.config.ts**
Ensure the image is served with proper cache headers by confirming the public/ folder is used (not assets/ which gets hashed). If it's in assets/, move it to public/.

Report the before/after file size.