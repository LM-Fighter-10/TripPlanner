from django.contrib import admin
from django.urls import path, include
from trips.views import proxy_mapbox

urlpatterns = [
    path('admin/', admin.site.urls),
    path('proxy-mapbox/', proxy_mapbox, name='proxy_mapbox'),
]
