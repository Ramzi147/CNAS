from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("evaluations", "0010_evaluationcriterion_form_version_is_active"),
    ]

    operations = [
        migrations.AlterField(
            model_name="selfevaluation",
            name="status",
            field=models.CharField(
                choices=[
                    ("draft", "Draft"),
                    ("submitted", "Submitted"),
                    ("reviewed", "Reviewed"),
                    ("rejected", "Rejected"),
                    ("integrated", "Integrated into evaluation process"),
                ],
                default="draft",
                max_length=20,
            ),
        ),
    ]
