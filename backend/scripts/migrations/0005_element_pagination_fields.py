"""
Add pagination fields to Element model.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('scripts', '0004_alter_script_font_family_alter_script_paper_color_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='element',
            name='page_number',
            field=models.PositiveIntegerField(default=1),
        ),
        migrations.AddField(
            model_name='element',
            name='order_within_page',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AlterModelOptions(
            name='element',
            options={'ordering': ['page_number', 'order_within_page', 'order']},
        ),
    ]
