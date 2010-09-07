#!/usr/bin/env ruby

require 'rubygems'
require 'nokogiri'
require 'json'
require 'open-uri'

doc = Nokogiri::HTML(open('http://www.caltrain.com/schedules/weekdaytimetable.html'))

def text_to_time(cell, train_number)
    txt = cell.text.delete("\r\n\302\240 -")
    unless txt.empty?
      time = txt.split(":").map(&:to_i)
      if (cell/"strong").length > 0
        time[0] += 12 unless time[0] == 12
      end
      time[0] += 12 if ["197", "198", "451", "454"].include?(train_number) && time[0] < 14
      time[0] += 12 if "454" == train_number && time[0] < 20
      txt = sprintf("%02d:%02d", *time)
      p txt if train_number == "454"
    end
    return txt
end

# ==Weekday==

# NORTHBOUND
northbound = doc/'//table[@summary="Weekday Northbound service"]'

train_numbers = northbound/'tbody/tr[1]/th/text()'
train_numbers = train_numbers.map(&:to_s).find_all{|n| n =~ /\d\d\d/}

stations = (northbound/"tbody/tr/th[2]/a").map(&:text).map{|t| t.gsub(/\302\240/,' ')}

trains = {}

3.upto(train_numbers.length+2) do |column|
  cell_index = column
  cell_index += 1 if column >= 27
  times = []
  train_number = train_numbers[column-3]
  cells = northbound/"tbody/tr/td[#{cell_index}]"
  cells.each_with_index do |cell, index|
    txt = text_to_time(cell, train_number)
    times << [stations[index], txt] unless txt.empty?
  end
  trains[train_number] = times
end

# SOUTHBOUND

southbound = doc/'//table[@summary="Weekday Southbound service"]'

train_numbers = southbound/'tbody/tr[1]/th/text()'
train_numbers = train_numbers.map(&:to_s).find_all{|n| n =~ /\d\d\d/}

stations = (southbound/"tbody/tr/th[2]/a").map(&:text).map{|t| t.gsub(/\302\240/,' ')}

3.upto(train_numbers.length+2) do |column|
  cell_index = column
  cell_index += 1 if column >= 27
  times = []
  train_number = train_numbers[column-3]
  cells = southbound/"tbody/tr/td[#{cell_index}]"
  cells.each_with_index do |cell, index|
    txt = text_to_time(cell, train_number)
    times << [stations[index], txt] unless txt.empty?
  end
  trains[train_number] = times
end

f = File.open("weekday_schedule.json", "wb")
f.write(JSON.pretty_generate(trains))
f.close()

# == Weekend ==
doc = Nokogiri::HTML(open('http://www.caltrain.com/schedules/weekendtimetable.html'))

northbound = doc/'//table[@summary="Weekend and Holiday Northbound service"]'
southbound = doc/'//table[@summary="Weekend and Holiday Southbound service"]'

saturday = {}
sunday = {}

saturday_trains = []
sunday_trains = []

# NORTHBOUND
stations = (northbound/"tbody/tr/th[1]/a").map(&:text).map{|t| t.gsub(/\302\240/,' ')}[2..100]

(northbound/'tbody/tr[1]/th').each do |cell|
  raw = cell.text.to_s
  filtered = raw.delete("\r\n\302\240 -#")
  unless filtered =~ /TrainNo./
    saturday_trains << filtered[0..2]
    unless filtered =~ /SAT.only/
      sunday_trains << filtered[0..2]
    end
  end
end

2.upto(saturday_trains.length+1) do |column|
  cells = northbound/"tbody/tr/td[#{column}]"
  times = []
  train_number = saturday_trains[column-2]
  cells.each_with_index do |cell, index|
    if index > 1
      txt = text_to_time(cell, train_number)
      times << [stations[index-2], txt] unless txt.empty?
    end
  end
  saturday[train_number] = times
  sunday[train_number] = times if sunday_trains.include?(train_number)
end

# SOUTHBOUND
stations = (southbound/"tbody/tr/th[1]/a").map(&:text).map{|t| t.gsub(/\302\240/,' ')}[0..-3]

saturday_trains = []
sunday_trains = []
(southbound/'tbody/tr[1]/th').each do |cell|
  raw = cell.text.to_s
  filtered = raw.delete("\r\n\302\240 -#")
  unless filtered =~ /TrainNo./ || filtered =~/^SATURDAY/
    saturday_trains << filtered[0..2]
    unless filtered =~ /SAT/
      sunday_trains << filtered[0..2]
    end
  end
end
saturday_trains << "450"
saturday_trains << "454"

2.upto(saturday_trains.length+1) do |column|
  cells = southbound/"tbody/tr/td[#{column}]"
  times = []
  train_number = saturday_trains[column-2]
  cells.each_with_index do |cell, index|
    if index < 24 && !(cell.text =~ /\d\d\d/)
      txt = text_to_time(cell, train_number)
      times << [stations[index], txt] unless txt.empty?
    end
  end
  saturday[train_number] = times
  sunday[train_number] = times if sunday_trains.include?(train_number)
end

f = File.open("saturday_schedule.json", "wb")
f.write(JSON.pretty_generate(saturday))
f.close()

f = File.open("sunday_schedule.json", "wb")
f.write(JSON.pretty_generate(sunday))
f.close()
