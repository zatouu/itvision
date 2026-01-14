# 🚀 QUICK START - Variant Images

**⏱️ Time to understand: 2 minutes**

## What's New?

✅ **Admins** can upload images for product variants  
✅ **Customers** see variant images in the gallery  
✅ **Gallery updates** dynamically when variant changes  

## For Admins (Upload Images)

```
1. Go to /admin/produits
2. Edit product
3. Click "Uploader" next to variant image
4. Select image from PC
5. See success message
6. Save product
```

**Supported formats**: JPG, PNG, WebP, GIF  
**Max size**: 5 MB  
**Rate limit**: 10 uploads/hour  

## For Customers (View Images)

```
1. Open product page
2. See product gallery
3. Click variant → Gallery updates
4. Different variant → Gallery updates again
5. Add to cart
```

**No changes needed**, just works!

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Upload fails | Check file size (< 5 MB), format (JPG/PNG/WebP/GIF) |
| Image not showing | Reload page (Ctrl+Shift+R) |
| No image for variant | Gallery shows product main image (OK!) |

## Technical

- **Build**: ✅ OK (45s)
- **Security**: ✅ JWT auth + rate limiting
- **Storage**: `/public/uploads/variants/`
- **Database**: MongoDB (variant.image field)

## Documentation

Start with what you need:

| Role | Start Here |
|------|-----------|
| Admin | [User Guide](VARIANT_IMAGES_USER_GUIDE.md) |
| Customer | [Visual Examples](VARIANT_IMAGES_VISUAL_EXAMPLES.md) |
| Developer | [Management Docs](VARIANT_IMAGES_MANAGEMENT.md) |
| Manager | [Summary](VARIANT_IMAGES_SUMMARY.md) |
| QA | [Checklist](VARIANT_IMAGES_CHECKLIST.md) |

**Full navigation**: [Index](VARIANT_IMAGES_INDEX.md)

---

**Status**: ✅ Production Ready  
**Version**: 1.0  
**January 2025**

