from django.contrib import admin

from .models import Alert, AlertResolution, DailyKpi, DailyStat, Profile, Report, Robot

admin.site.register(Robot)
admin.site.register(Profile)
admin.site.register(DailyStat)
admin.site.register(DailyKpi)
admin.site.register(Alert)
admin.site.register(AlertResolution)
admin.site.register(Report)
